import { MessageSquare, Image as ImageIcon, Video, Music, Database } from 'lucide-react';

export const ModalityIcon = ({ modality, className = "w-4 h-4" }: { modality: string, className?: string }) => {
  switch (modality) {
    case 'Text': return <MessageSquare className={className} />;
    case 'Image': return <ImageIcon className={className} />;
    case 'Video': return <Video className={className} />;
    case 'Audio': return <Music className={className} />;
    default: return <Database className={className} />;
  }
};
