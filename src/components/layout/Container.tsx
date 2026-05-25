import { type ReactNode, type ElementType } from "react";

interface ContainerProps {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  bleed?: boolean;
}

export function Container({
  as: Tag = "div",
  children,
  className = "",
  bleed = false,
}: ContainerProps) {
  return (
    <Tag
      className={
        bleed
          ? `w-full px-(--container-x) ${className}`
          : `w-full max-w-(--container-max) mx-auto px-(--container-x) ${className}`
      }
    >
      {children}
    </Tag>
  );
}
