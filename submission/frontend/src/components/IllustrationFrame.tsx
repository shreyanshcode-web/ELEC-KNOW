import { useState, type ReactNode } from 'react';

interface IllustrationFrameProps {
  alt: string;
  children?: ReactNode;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  src: string;
}

export default function IllustrationFrame({
  alt,
  children,
  className = '',
  imageClassName = '',
  priority = false,
  src,
}: IllustrationFrameProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`illustration-shell relative overflow-hidden ${className}`}>
      {!isLoaded && (
        <div
          aria-hidden="true"
          className="skeleton-wave absolute inset-0 rounded-[inherit]"
        />
      )}

      <img
        alt={alt}
        className={`h-full w-full transition duration-700 ease-out ${
          isLoaded ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0'
        } ${imageClassName}`}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={() => setIsLoaded(true)}
        src={src}
      />

      {children}
    </div>
  );
}
