import type { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  title: ReactNode;
  text: ReactNode;
  action: ReactNode;
};

/**
 * Centered card for confirmation and error pages, matching the legacy
 * complete-card styling. Sits inside a PortalShell.
 */
export default function MessageCard({ icon, title, text, action }: Props) {
  return (
    <div className="flex min-h-[calc(100vh-100px)] flex-col items-center justify-center p-5">
      <div className="mx-auto w-min rounded-[20px] bg-field px-10 py-[46px] text-center min-[769px]:min-w-[500px] max-[600px]:w-full max-[600px]:max-w-full max-[600px]:p-[30px]">
        {icon && (
          <div className="mx-auto mb-6 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-accent/10 text-accent max-[600px]:mb-5 max-[600px]:h-[55px] max-[600px]:w-[54px]">
            {icon}
          </div>
        )}

        <h1 className="mb-3.5 text-2xl leading-[30px] font-semibold whitespace-nowrap text-white max-[600px]:mb-2 max-[600px]:text-xl max-[600px]:leading-[26px] max-[600px]:whitespace-normal">
          {title}
        </h1>

        <p className="mb-6 block text-sm leading-5 tracking-[0.02em] text-ink-muted max-[600px]:mb-5">
          {text}
        </p>

        {action}
      </div>
    </div>
  );
}
