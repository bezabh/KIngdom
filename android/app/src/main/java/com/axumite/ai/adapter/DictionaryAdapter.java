package com.axumite.ai.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.axumite.ai.R;
import com.axumite.ai.model.DictionaryEntry;
import java.util.List;

public class DictionaryAdapter extends RecyclerView.Adapter<DictionaryAdapter.ViewHolder> {

    private List<DictionaryEntry> entries;

    public DictionaryAdapter(List<DictionaryEntry> entries) {
        this.entries = entries;
    }

    public void updateList(List<DictionaryEntry> newEntries) {
        this.entries = newEntries;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_dictionary_entry, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        DictionaryEntry entry = entries.get(position);
        holder.tvDictGeezWord.setText(entry.getGeezWord());
        holder.tvDictPhonetics.setText(entry.getPhonetics());
        holder.tvDictDefinition.setText(entry.getDefinition());
    }

    @Override
    public int getItemCount() {
        return entries != null ? entries.size() : 0;
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvDictGeezWord;
        TextView tvDictPhonetics;
        TextView tvDictDefinition;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            tvDictGeezWord = itemView.findViewById(R.id.tvDictGeezWord);
            tvDictPhonetics = itemView.findViewById(R.id.tvDictPhonetics);
            tvDictDefinition = itemView.findViewById(R.id.tvDictDefinition);
        }
    }
}
