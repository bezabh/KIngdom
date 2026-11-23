package com.axumite.ai;

import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;

public class TelebirrPaymentActivity extends AppCompatActivity {

    private ImageButton btnTelebirrBack;
    private TextView tvWalletBalance;
    private TextInputEditText etRecipientPhone;
    private TextInputEditText etAmount;
    private MaterialButton btnExecuteTransfer;

    private double balance = 4850.75;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_telebirr);

        initViews();
        setupListeners();
    }

    private void initViews() {
        btnTelebirrBack = findViewById(R.id.btnTelebirrBack);
        tvWalletBalance = findViewById(R.id.tvWalletBalance);
        etRecipientPhone = findViewById(R.id.etRecipientPhone);
        etAmount = findViewById(R.id.etAmount);
        btnExecuteTransfer = findViewById(R.id.btnExecuteTransfer);
    }

    private void setupListeners() {
        btnTelebirrBack.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });

        btnExecuteTransfer.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                executeTransfer();
            }
        });
    }

    private void executeTransfer() {
        String phone = etRecipientPhone.getText() != null ? etRecipientPhone.getText().toString().trim() : "";
        String amountStr = etAmount.getText() != null ? etAmount.getText().toString().trim() : "";

        if (TextUtils.isEmpty(phone)) {
            Toast.makeText(this, "Please enter recipient phone number", Toast.LENGTH_SHORT).show();
            return;
        }

        if (TextUtils.isEmpty(amountStr)) {
            Toast.makeText(this, "Please enter transfer amount", Toast.LENGTH_SHORT).show();
            return;
        }

        double amount = Double.parseDouble(amountStr);
        if (amount > balance) {
            Toast.makeText(this, "Insufficient Telebirr funds", Toast.LENGTH_SHORT).show();
            return;
        }

        balance -= amount;
        tvWalletBalance.setText(String.format("%.2f ETB", balance));
        Toast.makeText(this, "Successfully sent " + amount + " ETB to " + phone, Toast.LENGTH_LONG).show();
    }
}
