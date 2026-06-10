import { Streamdown } from "streamdown";
import "streamdown/styles.css";

interface MarkdownMessageProps {
  children: string;
  className?: string;
}

export function MarkdownMessage({ children, className }: MarkdownMessageProps) {
  return (
    <Streamdown className={className} mode="static" controls={false}>
      {children}
    </Streamdown>
  );
}
