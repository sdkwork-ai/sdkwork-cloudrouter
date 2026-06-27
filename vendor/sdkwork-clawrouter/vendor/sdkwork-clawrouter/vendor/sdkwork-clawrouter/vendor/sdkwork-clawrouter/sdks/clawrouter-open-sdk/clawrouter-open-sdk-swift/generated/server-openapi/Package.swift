// swift-tools-version:5.7
import PackageDescription

let package = Package(
    name: "AiSDK",
    platforms: [
        .iOS(.v13),
        .macOS(.v10_15),
    ],
    products: [
        .library(
            name: "AiSDK",
            targets: ["AiSDK"]
        ),
    ],
    dependencies: [
        .package(url: "https://github.com/sdkwork/sdk-common-swift.git", from: "1.0.0")
    ],
    targets: [
        .target(
            name: "AiSDK",
            dependencies: ["SDKworkCommon"],
            path: "Sources"
        )
    ]
)
