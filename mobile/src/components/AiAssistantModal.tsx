import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { apiService } from '../services/api';

interface AiAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  onDataUpdated?: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

export function AiAssistantModal({ visible, onClose, onDataUpdated }: AiAssistantModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Halo Bos! Ada yang bisa gue bantu soal nambah/kurangin stok atau rekapan keuangan hari ini?',
    },
  ]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (textToSend?: string) => {
    const input = (textToSend || prompt).trim();
    if (!input) return;

    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setPrompt('');

    setLoading(true);
    try {
      const res = await apiService.sendAiChat(input);
      if (res && res.reply) {
        const aiMsg: Message = { id: (Date.now() + 1).toString(), sender: 'ai', text: res.reply };
        setMessages((prev) => [...prev, aiMsg]);

        // If stock/product modified, trigger refresh in parent
        if (res.actionPerformed === 'update_stock' || res.actionPerformed === 'add_new_product') {
          if (onDataUpdated) onDataUpdated();
        }
      } else if (res && res.error) {
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), sender: 'ai', text: 'Error: ' + res.error },
        ]);
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), sender: 'ai', text: 'Koneksi error: ' + e.message },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MaterialCommunityIcons name="robot text" size={24} color="#00f2fe" />
              <Text style={styles.headerTitle}>SiKasir AI Assistant</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Prompt Quick Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
            <TouchableOpacity
              style={styles.pill}
              onPress={() => handleSend('Omset hari ini')}
            >
              <Text style={styles.pillText}>📊 Omset Hari Ini</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pill}
              onPress={() => handleSend('Laku 5 Sampoerna')}
            >
              <Text style={styles.pillText}>🛒 Laku 5 Sampoerna</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pill}
              onPress={() => handleSend('Restock 1 bal Sampoerna')}
            >
              <Text style={styles.pillText}>📦 Restock 1 bal Sampoerna</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pill}
              onPress={() => handleSend('Keuangan bulan ini')}
            >
              <Text style={styles.pillText}>📅 Rekap Bulan Ini</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Chat Messages */}
          <ScrollView style={styles.messagesWrap} contentContainerStyle={{ paddingVertical: 8 }}>
            {messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.msgBubble,
                  m.sender === 'user' ? styles.userBubble : styles.aiBubble,
                ]}
              >
                <Text
                  style={[
                    styles.msgText,
                    m.sender === 'user' ? styles.userMsgText : styles.aiMsgText,
                  ]}
                >
                  {m.text}
                </Text>
              </View>
            ))}

            {loading && (
              <View style={[styles.msgBubble, styles.aiBubble, { flexDirection: 'row', gap: 8 }]}>
                <ActivityIndicator size="small" color="#00f2fe" />
                <Text style={styles.aiMsgText}>Sedang memproses...</Text>
              </View>
            )}
          </ScrollView>

          {/* Input Area */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Perintah AI (misal: Laku 3 bks Sampoerna)..."
              placeholderTextColor="#64748b"
              value={prompt}
              onChangeText={setPrompt}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !prompt.trim() && styles.sendBtnDisabled]}
              disabled={!prompt.trim() || loading}
              onPress={() => handleSend()}
            >
              <Ionicons name="send" size={18} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#1e293b',
    maxHeight: '80%',
    minHeight: 450,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  pillsScroll: {
    marginVertical: 10,
    maxHeight: 36,
  },
  pill: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pillText: {
    fontSize: 11,
    color: '#00f2fe',
    fontWeight: '600',
  },
  messagesWrap: {
    flex: 1,
    marginVertical: 8,
  },
  msgBubble: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    maxWidth: '85%',
  },
  userBubble: {
    backgroundColor: '#00f2fe',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#1e293b',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 18,
  },
  userMsgText: {
    color: '#000000',
    fontWeight: '600',
  },
  aiMsgText: {
    color: '#f8fafc',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  input: {
    flex: 1,
    backgroundColor: '#07090e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#ffffff',
    paddingHorizontal: 14,
    height: 44,
    fontSize: 13,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#00f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
