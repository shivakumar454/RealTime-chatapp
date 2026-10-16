import { X, Bot } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import useChatStore from "../store/useChatStore.js";

const ChatHeader = ({ onAskAI }) => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        
        {/* User info */}
        <div className="flex items-center gap-3">

          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img
                src={selectedUser.profilePic || "/avatar.png"}
                alt={selectedUser.fullName}
              />
            </div>
          </div>

          {/* User info */}
          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>

            <p className="text-sm text-base-content/70">
              {onlineUsers.includes(selectedUser._id)
                ? "Online"
                : "Offline"}
            </p>
          </div>
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-2">

          {/* Ask AI button */}
          <button
            onClick={onAskAI}
            className="btn btn-sm btn-ghost"
            title="Ask AI about this conversation"
          >
            <Bot size={20} />
            <span className="hidden sm:inline">Ask AI</span>
          </button>

          {/* Close button */}
          <button onClick={() => setSelectedUser(null)}>
            <X />
          </button>

        </div>
      </div>
    </div>
  );
};

export default ChatHeader;