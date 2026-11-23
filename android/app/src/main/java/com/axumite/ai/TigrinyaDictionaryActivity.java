package com.axumite.ai;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageButton;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.axumite.ai.adapter.DictionaryAdapter;
import com.axumite.ai.model.DictionaryEntry;
import java.util.ArrayList;
import java.util.List;

public class TigrinyaDictionaryActivity extends AppCompatActivity {

    private ImageButton btnDictBack;
    private EditText etDictSearch;
    private RecyclerView rvDictionaryEntries;

    private DictionaryAdapter adapter;
    private List<DictionaryEntry> allEntries;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_dictionary);

        initViews();
        loadData();
        setupListeners();
    }

    private void initViews() {
        btnDictBack = findViewById(R.id.btnDictBack);
        etDictSearch = findViewById(R.id.etDictSearch);
        rvDictionaryEntries = findViewById(R.id.rvDictionaryEntries);
    }

    private void loadData() {
        allEntries = new ArrayList<>();
        allEntries.add(new DictionaryEntry("ሰላም", "Selam", "Peace, wellbeing, customary greeting throughout the Horn of Africa."));
        allEntries.add(new DictionaryEntry("ጥበብ", "T'ibeb", "Wisdom, sacred knowledge, mastery of philosophical arts and sciences."));
        allEntries.add(new DictionaryEntry("ሓርነት", "Harnet", "Liberty, sovereignty, unyielding national independence."));
        allEntries.add(new DictionaryEntry("ጽንዓት", "Tsin'at", "Resilience, steadfast endurance through generations of civilization."));
        allEntries.add(new DictionaryEntry("ሓድነት", "Hadnet", "Unity, collective strength, and enduring cultural solidarity."));
        allEntries.add(new DictionaryEntry("ምዕባለ", "M'ibale", "Progress, technological, social, and economic advancement."));

        adapter = new DictionaryAdapter(new ArrayList<>(allEntries));
        rvDictionaryEntries.setLayoutManager(new LinearLayoutManager(this));
        rvDictionaryEntries.setAdapter(adapter);
    }

    private void setupListeners() {
        btnDictBack.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });

        etDictSearch.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                filter(s.toString());
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });
    }

    private void filter(String text) {
        List<DictionaryEntry> filtered = new ArrayList<>();
        for (DictionaryEntry entry : allEntries) {
            if (entry.getGeezWord().contains(text)
                    || entry.getPhonetics().toLowerCase().contains(text.toLowerCase())
                    || entry.getDefinition().toLowerCase().contains(text.toLowerCase())) {
                filtered.add(entry);
            }
        }
        adapter.updateList(filtered);
    }
}
