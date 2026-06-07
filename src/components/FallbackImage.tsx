import React, { useState, useEffect } from "react";

interface FallbackImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackText: string;
  containerClassName?: string;
}

export default function FallbackImage({
  fallbackText,
  containerClassName = "",
  className = "",
  src,
  alt,
  style,
  ...props
}: FallbackImageProps) {
  const [error, setError] = useState(false);

  // Reset error state if src changes
  useEffect(() => {
    setError(false);
  }, [src]);

  const fallbackLetters =
    fallbackText
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  if (error || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-800 text-gray-300 font-bold tracking-wider leading-none shadow-inner border border-gray-700/50 ${containerClassName || className}`}
        style={{ minWidth: '24px', minHeight: '24px', ...style }}
        title={fallbackText}
      >
        <span>{fallbackLetters}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || fallbackText}
      className={className}
      style={style}
      onError={() => setError(true)}
      {...props}
    />
  );
}
