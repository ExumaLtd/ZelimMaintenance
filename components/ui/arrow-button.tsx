import clsx from "clsx";
import type { ReactNode } from "react";

const baseClasses =
  "group cursor-pointer items-center gap-3 rounded-lg border border-warn bg-transparent " +
  "font-mono text-sm font-normal uppercase tracking-[0.1em] text-white no-underline " +
  "transition-colors duration-500 hover:bg-warn hover:text-page " +
  "disabled:cursor-default disabled:opacity-60";

function ArrowIcon({ back }: { back?: boolean }) {
  return (
    <span className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-[3px] bg-warn transition-colors duration-500 group-hover:bg-page">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        className={clsx(back && "-scale-x-100")}
      >
        <path
          className="fill-page transition-[fill] duration-500 group-hover:fill-warn"
          d="M10.1458 7.5L0 7.5L0 5.83333L10.1458 5.83333L5.47917 1.16667L6.66667 0L13.3333 6.66667L6.66667 13.3333L5.47917 12.1667L10.1458 7.5Z"
        />
      </svg>
    </span>
  );
}

type Props = {
  children: ReactNode;
  /** Renders an anchor when set, a button otherwise. */
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  /** Stretch to the container width with a centered label. */
  fullWidth?: boolean;
  /** Put the arrow on the left, pointing back. */
  direction?: "forward" | "back";
};

/** The Zelim arrow button: yellow outline, mono uppercase label, arrow tile. */
export default function ArrowButton({
  children,
  href,
  type = "button",
  disabled,
  onClick,
  fullWidth = false,
  direction = "forward",
}: Props) {
  const back = direction === "back";
  const classes = clsx(
    baseClasses,
    fullWidth ? "flex w-full" : "inline-flex",
    back ? "py-[7px] pr-6 pl-[7px]" : "py-[7px] pr-[7px] pl-6",
  );
  const inner = (
    <>
      {back && <ArrowIcon back />}
      <span className={clsx("min-w-0 flex-1", fullWidth && "text-center")}>{children}</span>
      {!back && <ArrowIcon />}
    </>
  );

  if (href !== undefined) {
    return (
      <a className={classes} href={href} onClick={onClick}>
        {inner}
      </a>
    );
  }
  return (
    <button className={classes} type={type} disabled={disabled} onClick={onClick}>
      {inner}
    </button>
  );
}
