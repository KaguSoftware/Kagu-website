import { createElement, type ReactNode, type ElementType } from "react";

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
  // `createElement` (vs `<Tag>`) sidesteps a JSX quirk: @react-three/fiber adds
  // ~200 entries to JSX.IntrinsicElements, so a polymorphic `ElementType` tag
  // resolves `children` to `never`. Same runtime, clean types.
  return createElement(
    Tag,
    {
      className: bleed
        ? `w-full px-(--container-x) ${className}`
        : `w-full max-w-(--container-max) mx-auto px-(--container-x) ${className}`,
    },
    children,
  );
}
