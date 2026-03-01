import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { CSSProperties } from 'react';

type ClickableImagePreviewProps = {
  src?: string | null;
  alt: string;
  triggerClassName?: string;
  imageClassName?: string;
  previewImageClassName?: string;
  fallbackClassName?: string;
  imageStyle?: CSSProperties;
  previewImageStyle?: CSSProperties;
};

function ClickableImagePreview({
  src,
  alt,
  triggerClassName,
  imageClassName,
  previewImageClassName,
  fallbackClassName,
  imageStyle,
  previewImageStyle,
}: ClickableImagePreviewProps) {
  if (!src) {
    return (
      <div
        className={cn(
          'flex justify-center items-center w-20 h-16 text-xs bg-transparent rounded-md text-muted-foreground',
          fallbackClassName,
        )}
      >
        이미지 없음
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type='button'
          onClick={(event) => event.stopPropagation()}
          className={cn(
            'inline-flex overflow-hidden justify-center items-center bg-transparent rounded-md transition-colors hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            triggerClassName,
          )}
          aria-label={`${alt} 확대 보기`}
        >
          <img
            src={src}
            alt={alt}
            loading='lazy'
            className={cn('object-contain w-full h-full', imageClassName)}
            style={imageStyle}
          />
        </button>
      </DialogTrigger>
      <DialogContent className='max-h-[92vh] max-w-5xl border-border/70 bg-background/95 p-4 sm:p-5'>
        <DialogTitle className='sr-only'>{alt}</DialogTitle>
        <div className='flex max-h-[80vh] items-center justify-center overflow-auto rounded-lg bg-muted/20 p-2'>
          <img
            src={src}
            alt={alt}
            className={cn('object-contain w-auto max-w-full max-h-[76vh]', previewImageClassName)}
            style={previewImageStyle}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ClickableImagePreview;
