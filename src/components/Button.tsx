import React from "react";
import { motion } from "framer-motion";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "light" | "outline";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  href?: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "right",
  href,
  target,
  rel,
  onClick,
  className = "",
  disabled = false,
  fullWidth = false,
}) => {
  const baseStyles =
    "relative inline-flex items-center justify-center gap-2 font-semibold tracking-wide uppercase rounded-full transition-all duration-300 cursor-pointer group overflow-hidden";

  const sizeStyles = {
    sm: "px-4 min-h-[36px] text-xs",
    md: "px-6 min-h-[44px] text-sm",
    lg: "px-8 min-h-[48px] text-base",
  };

  const iconSize = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-4 w-4",
  };

  const variantStyles = {
    primary:
      "bg-[#5A1020] text-[#CCA681] hover:bg-[#6d1528] hover:shadow-[0_0_30px_rgba(90,16,32,0.5)]",
    light:
      "bg-[#CCA681] text-[#5A1020] hover:bg-[#e3c79a] hover:shadow-[0_0_35px_rgba(204,166,129,0.45)]",
    outline:
      "border-2 border-white/30 text-white hover:border-white/50 hover:bg-white/10",
  };

  const widthStyle = fullWidth ? "w-full" : "";

  const defaultArrow = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`${iconSize[size]} transition-transform duration-300 group-hover:translate-x-1`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M17 8l4 4m0 0l-4 4m4-4H3"
      />
    </svg>
  );

  const content = (
    <>
      <span className="relative z-10 flex items-center gap-2">
        {iconPosition === "left" && (icon || defaultArrow)}
        <span className="font-bold">{children}</span>
        {iconPosition === "right" && (icon || defaultArrow)}
      </span>
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-r from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </>
  );

  const combinedClassNames = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className} ${
    disabled ? "opacity-50 cursor-not-allowed" : ""
  }`;

  if (href) {
    return (
    <motion.a
      href={href}
      target={target}
      rel={rel}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={combinedClassNames}
    >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={combinedClassNames}
    >
      {content}
    </motion.button>
  );
};

export default Button;
