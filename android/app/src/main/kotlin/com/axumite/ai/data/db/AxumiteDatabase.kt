package com.axumite.ai.data.db

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "tigrinya_lexicon")
data class LexiconEntry(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "word_ti") val wordTi: String,
    @ColumnInfo(name = "geez_root") val geezRoot: String,
    @ColumnInfo(name = "translation_en") val translationEn: String,
    @ColumnInfo(name = "definition_ti") val definitionTi: String,
    @ColumnInfo(name = "category") val category: String
)

@Dao
interface LexiconDao {
    @Query("SELECT * FROM tigrinya_lexicon ORDER BY word_ti ASC")
    fun getAllWords(): Flow<List<LexiconEntry>>

    @Query("SELECT * FROM tigrinya_lexicon WHERE word_ti LIKE '%' || :query || '%' OR definition_ti LIKE '%' || :query || '%'")
    fun searchWords(query: String): Flow<List<LexiconEntry>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWords(entries: List<LexiconEntry>)
}

@Database(entities = [LexiconEntry::class], version = 1, exportSchema = false)
abstract class AxumiteDatabase : RoomDatabase() {
    abstract fun lexiconDao(): LexiconDao
}