"use client";

import React from "react";
import { Helix } from "ldrs/react";
import "ldrs/react/Helix.css";
import "ldrs/ring";


type CommonProps = {
  size?: number | string;
  color?: string;
  className?: string;
};

type HelixProps = CommonProps & {
  speed?: number | string;
};

export function HelixLoader({ size = 45, speed = 2.5, color = "black", className }: HelixProps) {
  return (
    <div className={className}>
      <Helix size={String(size)} speed={String(speed)} color={color} />
    </div>
  );
}

export function RingLoader({ size = 60, color = "coral", className }: CommonProps) {
  // Use a React-friendly wrapper around the custom element to avoid JSX namespace augmentation.
  return React.createElement("l-ring", { size: String(size), color, className });
}