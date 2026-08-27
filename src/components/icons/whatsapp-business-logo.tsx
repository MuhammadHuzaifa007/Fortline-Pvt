import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function WhatsAppBusinessLogo({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* WhatsApp Speech bubble shape */}
      <path
        d="M12.012 2C6.506 2 2.023 6.478 2.022 11.984C2.022 13.744 2.481 15.458 3.355 16.972L2 22L7.132 20.653C8.618 21.464 10.297 21.968 12.017 21.968C17.522 21.968 22.005 17.49 22.006 11.984C22.006 9.316 20.967 6.808 19.081 4.922C17.195 3.036 14.68 2 12.012 2Z"
        fill="currentColor"
      />
      {/* WhatsApp Business Capital 'B' emblem */}
      <path
        d="M9.25 7.5H12.6C14.05 7.5 15.05 8.25 15.05 9.42C15.05 10.25 14.55 10.9 13.7 11.18C14.7 11.45 15.35 12.25 15.35 13.28C15.35 14.68 14.2 15.5 12.55 15.5H9.25V7.5ZM10.75 8.85V10.6H12.45C13.1 10.6 13.55 10.3 13.55 9.72C13.55 9.15 13.1 8.85 12.45 8.85H10.75ZM10.75 11.85V14.15H12.55C13.25 14.15 13.8 13.8 13.8 13C13.8 12.2 13.25 11.85 12.55 11.85H10.75Z"
        fill="#128C7E"
      />
    </svg>
  );
}

export function WhatsAppBadgeLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center rounded-xl bg-[#008069] text-white shadow-md shadow-[#008069]/30 transition-transform hover:scale-105 ${className}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-3/5 w-3/5"
      >
        <path
          d="M12.012 2C6.506 2 2.023 6.478 2.022 11.984C2.022 13.744 2.481 15.458 3.355 16.972L2 22L7.132 20.653C8.618 21.464 10.297 21.968 12.017 21.968C17.522 21.968 22.005 17.49 22.006 11.984C22.006 9.316 20.967 6.808 19.081 4.922C17.195 3.036 14.68 2 12.012 2Z"
          fill="white"
        />
        <path
          d="M9.25 7.5H12.6C14.05 7.5 15.05 8.25 15.05 9.42C15.05 10.25 14.55 10.9 13.7 11.18C14.7 11.45 15.35 12.25 15.35 13.28C15.35 14.68 14.2 15.5 12.55 15.5H9.25V7.5ZM10.75 8.85V10.6H12.45C13.1 10.6 13.55 10.3 13.55 9.72C13.55 9.15 13.1 8.85 12.45 8.85H10.75ZM10.75 11.85V14.15H12.55C13.25 14.15 13.8 13.8 13.8 13C13.8 12.2 13.25 11.85 12.55 11.85H10.75Z"
          fill="#128C7E"
        />
      </svg>
    </div>
  );
}
