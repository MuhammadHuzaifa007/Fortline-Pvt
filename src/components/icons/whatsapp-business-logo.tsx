import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Official WhatsApp Web Chats / Inbox Icon with the signature rounded speech bubble outline
 * and bottom-left curved tail matching WhatsApp Web navigation.
 */
export function WhatsAppChatsIcon({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

/**
 * Official WhatsApp Phone Icon with classic telephone handset inside speech bubble.
 */
export function WhatsAppPhoneIcon({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path d="M17.472 14.382c-.301-.15-1.78-.879-2.056-.98-.275-.1-.475-.15-.675.15-.2.3-.775.98-.95 1.18-.175.2-.35.225-.65.075-.3-.15-1.267-.467-2.413-1.488-.893-.796-1.496-1.78-1.671-2.08-.175-.3-.019-.462.13-.611.136-.134.301-.35.451-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.625-.925-2.225-.244-.584-.492-.505-.675-.514-.175-.009-.375-.011-.575-.011s-.525.075-.8.375c-.275.3-1.05 1.025-1.05 2.5s1.075 2.9 1.225 3.1c.15.2 2.116 3.23 5.125 4.53 3.01 1.3 3.01.867 3.56.817.55-.05 1.78-.725 2.03-1.425.25-.7.25-1.3.175-1.425-.075-.125-.275-.2-.575-.35zM12.012 2.002C6.5 2.002 2.023 6.48 2.023 11.987c0 1.76.46 3.475 1.334 4.99L2 22.002l5.13-1.348c1.488.812 3.167 1.316 4.882 1.316 5.513 0 9.99-4.478 9.99-9.984 0-2.668-1.04-5.176-2.926-7.062-1.886-1.886-4.402-2.922-7.064-2.922zm0 18.298c-1.488 0-2.946-.4-4.214-1.154l-.302-.18-3.13.82.836-3.05-.198-.314c-.828-1.32-1.266-2.85-1.266-4.435 0-4.57 3.72-8.29 8.274-8.29 2.21 0 4.29.862 5.852 2.426 1.564 1.564 2.425 3.644 2.425 5.854 0 4.57-3.72 8.323-8.476 8.323z" />
    </svg>
  );
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
        fill="#075E54"
      />
    </svg>
  );
}

export function WhatsAppBadgeLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center rounded-full bg-[#008069] text-white shadow-md shadow-[#008069]/30 transition-transform hover:scale-105 ${className}`}>
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
          fill="#075E54"
        />
      </svg>
    </div>
  );
}

export function EmailBadgeLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center rounded-full bg-[#EA4335] text-white shadow-md shadow-[#EA4335]/30 transition-transform hover:scale-105 ${className}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
        className="h-3/5 w-3/5"
      >
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    </div>
  );
}
