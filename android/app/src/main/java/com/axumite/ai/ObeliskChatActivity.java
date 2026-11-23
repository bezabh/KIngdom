package com.axumite.ai;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognizerIntent;
import android.text.TextUtils;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.Toast;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.axumite.ai.adapter.ChatMessageAdapter;
import com.axumite.ai.model.ChatMessage;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class ObeliskChatActivity extends AppCompatActivity {

    private static final int SPEECH_REQUEST_CODE = 101;

    private RecyclerView rvChatMessages;
    private EditText etMessageInput;
    private FloatingActionButton btnSendMessage;
    private ImageButton btnVoiceInput;
    private ImageButton btnBack;
    private ImageButton btnClearChat;
    private LinearLayout layoutTypingIndicator;

    private ChatMessageAdapter messageAdapter;
    private List<ChatMessage> messageList;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chat);

        initViews();
        setupRecyclerView();
        setupListeners();

        if (getIntent().getBooleanExtra("auto_start_voice", false)) {
            startVoiceInput();
        }
    }

    private void initViews() {
        rvChatMessages = findViewById(R.id.rvChatMessages);
        etMessageInput = findViewById(R.id.etMessageInput);
        btnSendMessage = findViewById(R.id.btnSendMessage);
        btnVoiceInput = findViewById(R.id.btnVoiceInput);
        btnBack = findViewById(R.id.btnBack);
        btnClearChat = findViewById(R.id.btnClearChat);
        layoutTypingIndicator = findViewById(R.id.layoutTypingIndicator);
    }

    private void setupRecyclerView() {
        messageList = new ArrayList<>();
        messageList.add(new ChatMessage("1", "ሰላም! ኣነ ኦበሊስክ AI እየ። ብትግርኛ ወይ ብግእዝ ዝኾነ ሕቶ ክትሓቱኒ ትኽእሉ ኢኹም።", "10:00 AM", true));
        
        messageAdapter = new ChatMessageAdapter(messageList);
        rvChatMessages.setLayoutManager(new LinearLayoutManager(this));
        rvChatMessages.setAdapter(messageAdapter);
    }

    private void setupListeners() {
        btnBack.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });

        btnClearChat.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                messageList.clear();
                messageList.add(new ChatMessage("1", "ናይ ዕላል ታሪኽ ጸሪጉ ኣሎ። ሓድሽ ሕቶ ክትሓቱ ትኽእሉ ኢኹም።", getCurrentTime(), true));
                messageAdapter.notifyDataSetChanged();
                Toast.makeText(ObeliskChatActivity.this, "ታሪኽ ተጸሪጉ", Toast.LENGTH_SHORT).show();
            }
        });

        btnSendMessage.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                sendMessage();
            }
        });

        btnVoiceInput.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startVoiceInput();
            }
        });
    }

    private void sendMessage() {
        String text = etMessageInput.getText().toString().trim();
        if (TextUtils.isEmpty(text)) return;

        ChatMessage userMsg = new ChatMessage(String.valueOf(System.currentTimeMillis()), text, getCurrentTime(), false);
        messageList.add(userMsg);
        messageAdapter.notifyItemInserted(messageList.size() - 1);
        rvChatMessages.scrollToPosition(messageList.size() - 1);
        etMessageInput.setText("");

        layoutTypingIndicator.setVisibility(View.VISIBLE);

        // Simulate Sovereign LLM response in Tigrinya
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                layoutTypingIndicator.setVisibility(View.GONE);
                String aiReply = generateSovereignResponse(text);
                ChatMessage aiMsg = new ChatMessage(String.valueOf(System.currentTimeMillis()), aiReply, getCurrentTime(), true);
                messageList.add(aiMsg);
                messageAdapter.notifyItemInserted(messageList.size() - 1);
                rvChatMessages.scrollToPosition(messageList.size() - 1);
            }
        }, 1200);
    }

    private String generateSovereignResponse(String prompt) {
        if (prompt.contains("ሰላም") || prompt.toLowerCase().contains("selam") || prompt.toLowerCase().contains("hello")) {
            return "ሰላም ጤናይስጥልኝ! ከመይ ኣለኹም? ናይ ጥንታዊ ታሪክ፡ ባህሊ፡ ወይ ቴክኖሎጂ ዝምልከት እንታይ ክሕግዘኩም ትደልዩ?";
        } else if (prompt.contains("ምስላ") || prompt.contains("ጥበብ") || prompt.contains("wisdom")) {
            return "«ብልሓት ካብ ሓይሊ ትበልጽ» — ጥበብ ኣቦታትና ኣብ ንግስነት ኣክሱም ካብ ጥንቲ ዝተሰረተ ዓቢ መምርሒ እዩ።";
        } else {
            return "ሕቶኹም ብግቡእ ተቐቢለዮ ኣለኹ። «" + prompt + "» ንዝብል ሓሳብ ኣብ ባህላዊ መዝገብ ኣክሱማይትን ዘመናዊ ሳይንስን ተመርኲሰ ተንቲነዮ ኣለኹ።";
        }
    }

    private void startVoiceInput() {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ti-ET");
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "ብትግርኛ ተዛረቡ...");
        try {
            startActivityForResult(intent, SPEECH_REQUEST_CODE);
        } catch (Exception e) {
            Toast.makeText(this, "Voice recognition not supported on this device.", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == SPEECH_REQUEST_CODE && resultCode == RESULT_OK && data != null) {
            ArrayList<String> result = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (result != null && !result.isEmpty()) {
                etMessageInput.setText(result.get(0));
                sendMessage();
            }
        }
    }

    private String getCurrentTime() {
        return new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date());
    }
}
