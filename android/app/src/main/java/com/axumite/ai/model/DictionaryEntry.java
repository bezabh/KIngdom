package com.axumite.ai.model;

public class DictionaryEntry {
    private String geezWord;
    private String phonetics;
    private String definition;

    public DictionaryEntry(String geezWord, String phonetics, String definition) {
        this.geezWord = geezWord;
        this.phonetics = phonetics;
        this.definition = definition;
    }

    public String getGeezWord() {
        return geezWord;
    }

    public String getPhonetics() {
        return phonetics;
    }

    public String getDefinition() {
        return definition;
    }
}
