import type { AnchorHTMLAttributes } from "react";
import { useRouter } from "../lib/router";

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

export default function Link({ href, onClick, ...props }: LinkProps) {
  const { push } = useRouter();

  return (
    <a
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (href.startsWith("/")) {
          e.preventDefault();
          push(href);
        }
      }}
      {...props}
    />
  );
}
