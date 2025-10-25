import { useEffect, useState } from "react";
import Button from "../shared/Button";
import styles from "./ChatSidebar.module.css";
import { getChatSessions, deleteChatSession } from "../../../helpers/chat-session-api";
import toast from "react-hot-toast";

type ChatSession = {
  _id: string;
  title?: string;
  messages?: { content: string }[];
  updatedAt: string;
};

type ChatSidebarProps = {
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  currentSessionId?: string;
};

const ChatSidebar = ({ onNewChat, onSelectSession, currentSessionId }: ChatSidebarProps) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const data = await getChatSessions();
      if (data?.sessions) setSessions(data.sessions);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDeleteSession = async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering session selection
    if (!window.confirm("Are you sure you want to delete this chat session?")) return;

    try {
      const response = await deleteChatSession(sessionId);
      if (response) {
        setSessions((prev) => prev.filter((s) => s._id !== sessionId));
        
        // If we deleted the current session, clear it and notify parent
        if (currentSessionId === sessionId) {
          onNewChat(); // Reset to a new chat
        }
        toast.success("Chat deleted successfully");
      }
    } catch (err: any) {
      console.error("Failed to delete session:", err);
      toast.error(err?.message || "Failed to delete chat session");
    }
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.newChatButton}>
        <Button
          buttonLabel="+ New Chat"
          type="button"
          className={styles.newChatBtn}
          onClick={() => {
            onNewChat();
            setTimeout(fetchSessions, 200); // refresh sessions after creating new chat
          }}
        />
      </div>

      <div className={styles.sessionList}>
        {isLoading ? (
          <div className={styles.loading}>Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className={styles.noSessions}>No previous chats</div>
        ) : (
          sessions.map((session) => (
            <div
              key={session._id}
              className={`${styles.sessionItem} ${currentSessionId === session._id ? styles.active : ""}`}
            >
              <span
                className={styles.sessionTitle}
                onClick={() => onSelectSession(session._id)}
              >
                {session.title || session.messages?.[0]?.content?.slice(0, 20) || "Untitled Chat"}
              </span>
              <span className={styles.sessionDate}>
                {new Date(session.updatedAt).toLocaleString()}
              </span>
              <button
                className={styles.deleteSessionBtn}
                onClick={(e) => handleDeleteSession(session._id, e)}
                title="Delete Chat"
              >
                <span style={{ color: "red", fontWeight: "bold", fontSize: "16px" }}>×</span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
