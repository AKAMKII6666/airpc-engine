/**
 * Logo 图标（对照 airpc-studio-v2-logo-reference.svg 的抽象 A mark）。
 * 仅品牌识别；字标由旁侧 Typography 承担，避免把文字烘焙进图标。
 */
"use client";

import type { FC } from "react";
import { useId } from "react";

export type StudioLogoMarkProps = {
  /** 边长 px；导航栏默认 28 */
  size?: number;
  className?: string;
};

export const StudioLogoMark: FC<StudioLogoMarkProps> = function (props) {
  const { size = 28, className } = props;
  const uid = useId().replace(/:/g, "");
  const primaryId = `studioLogoPrimary-${uid}`;
  const secondaryId = `studioLogoSecondary-${uid}`;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="AirPC Studio"
    >
      <defs>
        <linearGradient
          id={primaryId}
          x1="40"
          y1="8"
          x2="108"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#7C8CFF" />
          <stop offset="0.48" stopColor="#536BFF" />
          <stop offset="1" stopColor="#32D6FF" />
        </linearGradient>
        <linearGradient
          id={secondaryId}
          x1="12"
          y1="100"
          x2="72"
          y2="24"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#25D0A2" />
          <stop offset="0.45" stopColor="#3AA8FF" />
          <stop offset="1" stopColor="#7A5CFF" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="#111A29" stroke="#253449" />
      <path
        d="M62.2 18.4C65.4 12.8 73.5 12.8 76.7 18.4L106.9 70.5C110.1 76.1 106.1 83.1 99.6 83.1H83.8C80.8 83.1 78 81.5 76.5 78.9L56 43.4C54.4 40.6 54.4 37.1 56 34.3L62.2 18.4Z"
        fill={`url(#${primaryId})`}
      />
      <path
        d="M45.4 44.7C48.6 39.1 56.7 39.1 59.9 44.7L67.7 58.3C69.3 61.1 69.3 64.5 67.7 67.3L47.2 102.8C45.7 105.4 42.9 107 39.9 107H24.1C17.6 107 13.6 100 16.8 94.4L45.4 44.7Z"
        fill={`url(#${secondaryId})`}
      />
      <rect x="72" y="88" width="30" height="14" rx="7" fill="#5B6CFF" />
    </svg>
  );
};
