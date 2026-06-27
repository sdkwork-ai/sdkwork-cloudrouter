import React, { useEffect, useState } from "react";
import type {
  SdkworkDriveNode,
  SdkworkDriveSpace,
} from "../../../../common/file/sdkwork-file-contracts/src/index";
import type { FilePlatformService } from "../../../../common/file/sdkwork-file-service/src/index";

export interface DriveSpaceTabsProps {
  onSelectSpace?: (space: SdkworkDriveSpace) => void;
  selectedSpaceId?: string;
  spaces: readonly SdkworkDriveSpace[];
}

export interface DriveNodeListProps {
  nodes: readonly SdkworkDriveNode[];
  onOpenFolder?: (node: SdkworkDriveNode) => void;
  onSelectFile?: (node: SdkworkDriveNode) => void;
  title?: string;
}

export interface DriveBrowserProps {
  onError?: (error: Error) => void;
  onSelectFile?: (node: SdkworkDriveNode) => void;
  requestIdFactory?: (phase: "nodes" | "spaces", spaceId?: string, parentNodeId?: string) => string;
  service: FilePlatformService;
  title?: string;
}

type DriveBrowserStatus = "failed" | "loading" | "ready";

export function DriveSpaceTabs({
  onSelectSpace,
  selectedSpaceId,
  spaces,
}: DriveSpaceTabsProps): React.ReactElement {
  return (
    <div aria-label="Drive spaces" role="tablist">
      {spaces.map((space) => {
        const selected = space.spaceId === selectedSpaceId;
        return (
          <button
            aria-selected={selected}
            key={space.spaceId}
            onClick={() => onSelectSpace?.(space)}
            role="tab"
            type="button"
          >
            {space.name}
          </button>
        );
      })}
    </div>
  );
}

export function DriveNodeList({
  nodes,
  onOpenFolder,
  onSelectFile,
  title = "Drive nodes",
}: DriveNodeListProps): React.ReactElement {
  return (
    <section aria-label={title}>
      <ul aria-label={title}>
        {nodes.map((node) => (
          <li data-drive-node-type={node.nodeType} key={node.nodeId}>
            <span>{node.name}</span>
            <span>{formatDriveNodeKind(node)}</span>
            {node.sizeBytes === undefined ? null : <span>{formatStorageBytes(node.sizeBytes)}</span>}
            {isFolderLike(node) ? (
              <button onClick={() => onOpenFolder?.(node)} type="button">
                {`Open ${node.name}`}
              </button>
            ) : null}
            {node.nodeType === "file" ? (
              <button onClick={() => onSelectFile?.(node)} type="button">
                {`Select ${node.name}`}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DriveBrowser({
  onError,
  onSelectFile,
  requestIdFactory = defaultRequestIdFactory,
  service,
  title = "Drive",
}: DriveBrowserProps): React.ReactElement {
  const [nodes, setNodes] = useState<SdkworkDriveNode[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | undefined>();
  const [spaces, setSpaces] = useState<SdkworkDriveSpace[]>([]);
  const [status, setStatus] = useState<DriveBrowserStatus>("loading");

  useEffect(() => {
    let disposed = false;
    setStatus("loading");

    void service
      .listDriveSpaces({ requestId: requestIdFactory("spaces") })
      .then(async (result) => {
        if (disposed) {
          return;
        }
        setSpaces(result.items);
        const firstSpace = result.items[0];
        if (!firstSpace) {
          setSelectedSpaceId(undefined);
          setNodes([]);
          setStatus("ready");
          return;
        }
        setSelectedSpaceId(firstSpace.spaceId);
        const nodeResult = await service.listDriveNodes({
          requestId: requestIdFactory("nodes", firstSpace.spaceId),
          spaceId: firstSpace.spaceId,
        });
        if (!disposed) {
          setNodes(nodeResult.items);
          setStatus("ready");
        }
      })
      .catch((error) => {
        if (!disposed) {
          setStatus("failed");
          onError?.(normalizeError(error));
        }
      });

    return () => {
      disposed = true;
    };
  }, [onError, requestIdFactory, service]);

  async function selectSpace(space: SdkworkDriveSpace): Promise<void> {
    setSelectedSpaceId(space.spaceId);
    setStatus("loading");
    try {
      const result = await service.listDriveNodes({
        requestId: requestIdFactory("nodes", space.spaceId),
        spaceId: space.spaceId,
      });
      setNodes(result.items);
      setStatus("ready");
    } catch (error) {
      setStatus("failed");
      onError?.(normalizeError(error));
    }
  }

  async function openFolder(node: SdkworkDriveNode): Promise<void> {
    if (!selectedSpaceId) {
      return;
    }
    setStatus("loading");
    try {
      const result = await service.listDriveNodes({
        parentNodeId: node.nodeId,
        requestId: requestIdFactory("nodes", selectedSpaceId, node.nodeId),
        spaceId: selectedSpaceId,
      });
      setNodes(result.items);
      setStatus("ready");
    } catch (error) {
      setStatus("failed");
      onError?.(normalizeError(error));
    }
  }

  return (
    <section aria-label={title} role="region">
      <h2>{title}</h2>
      <DriveSpaceTabs
        onSelectSpace={(space) => {
          void selectSpace(space);
        }}
        selectedSpaceId={selectedSpaceId}
        spaces={spaces}
      />
      {status === "loading" ? <p>Loading drive</p> : null}
      {status === "failed" ? <p>Unable to load drive</p> : null}
      <DriveNodeList
        nodes={nodes}
        onOpenFolder={(node) => {
          void openFolder(node);
        }}
        onSelectFile={onSelectFile}
      />
    </section>
  );
}

export function formatStorageBytes(bytes: number): string {
  const normalized = Math.max(0, bytes);
  const units = ["B", "KB", "MB", "GB", "TB", "PB"] as const;
  let value = normalized;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const rounded = Math.round(value * 10) / 10;
  const formatted = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
  return `${formatted} ${units[unitIndex]}`;
}

function defaultRequestIdFactory(phase: "nodes" | "spaces", spaceId?: string, parentNodeId?: string): string {
  if (phase === "spaces") {
    return "drive:spaces";
  }
  return `drive:nodes:${spaceId ?? "unknown"}:${parentNodeId ?? "root"}`;
}

function formatDriveNodeKind(node: SdkworkDriveNode): string {
  if (node.nodeType === "file") {
    return node.mimeType ?? "file";
  }
  return node.nodeType;
}

function isFolderLike(node: SdkworkDriveNode): boolean {
  return node.nodeType === "folder" || node.nodeType === "root";
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
