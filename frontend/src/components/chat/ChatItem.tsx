import React from "react";
import ReactMarkdown from "react-markdown";
import reactGFM from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

import styles from "./ChatItem.module.css";
import "highlight.js/styles/atom-one-dark.css";

import botIcon from "/logos/bot.png";
import { useAuth } from "../../context/context";

type Props = {
  content?: string;
  role: string;
};

const ChatItem = ({ content = "", role }: Props) => {
  const auth = useAuth();

  // Safe initials generation
  const initials = auth?.user?.name
    ? auth.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
    : "??";

  // Bot message
  const botMsg = (
    <div className={`${styles.parent} ${styles.bot_parent}`}>
      <div className={styles.avatar}>
        <img src={botIcon} alt="chat bot icon" />
      </div>
      <div className={`${styles.msg} markdown-body`}>
        <ReactMarkdown
          remarkPlugins={[reactGFM]}
          rehypePlugins={[rehypeHighlight]}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );

  // User message
  const userMsg = (
    <div className={`${styles.parent} ${styles.user_parent}`}>
      <div className={`${styles.avatar} ${styles.user_avatar}`}>
        {initials}
      </div>
      <div className={styles.msg}>
        <p>{content}</p>
      </div>
    </div>
  );

  return <>{role === "assistant" ? botMsg : userMsg}</>;
};

export default ChatItem;
