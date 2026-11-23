package com.axumite.ai.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.axumite.ai.R;
import com.axumite.ai.model.ChatMessage;
import java.util.List;

public class ChatMessageAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {

    private static final int VIEW_TYPE_USER = 1;
    private static final int VIEW_TYPE_AI = 2;

    private List<ChatMessage> messageList;

    public ChatMessageAdapter(List<ChatMessage> messageList) {
        this.messageList = messageList;
    }

    @Override
    public int getItemViewType(int position) {
        ChatMessage message = messageList.get(position);
        return message.isAi() ? VIEW_TYPE_AI : VIEW_TYPE_USER;
    }

    @NonNull
    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        if (viewType == VIEW_TYPE_USER) {
            View view = LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_chat_user, parent, false);
            return new UserViewHolder(view);
        } else {
            View view = LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_chat_ai, parent, false);
            return new AiViewHolder(view);
        }
    }

    @Override
    public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
        ChatMessage message = messageList.get(position);
        if (holder instanceof UserViewHolder) {
            ((UserViewHolder) holder).tvUserMessageBody.setText(message.getMessage());
            ((UserViewHolder) holder).tvUserMessageTime.setText(message.getTimestamp());
        } else if (holder instanceof AiViewHolder) {
            ((AiViewHolder) holder).tvAiMessageBody.setText(message.getMessage());
            ((AiViewHolder) holder).tvAiMessageTime.setText(message.getTimestamp());
        }
    }

    @Override
    public int getItemCount() {
        return messageList != null ? messageList.size() : 0;
    }

    static class UserViewHolder extends RecyclerView.ViewHolder {
        TextView tvUserMessageBody;
        TextView tvUserMessageTime;

        public UserViewHolder(@NonNull View itemView) {
            super(itemView);
            tvUserMessageBody = itemView.findViewById(R.id.tvUserMessageBody);
            tvUserMessageTime = itemView.findViewById(R.id.tvUserMessageTime);
        }
    }

    static class AiViewHolder extends RecyclerView.ViewHolder {
        TextView tvAiMessageBody;
        TextView tvAiMessageTime;

        public AiViewHolder(@NonNull View itemView) {
            super(itemView);
            tvAiMessageBody = itemView.findViewById(R.id.tvAiMessageBody);
            tvAiMessageTime = itemView.findViewById(R.id.tvAiMessageTime);
        }
    }
}
