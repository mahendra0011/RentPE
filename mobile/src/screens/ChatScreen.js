import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useSelector } from "react-redux";
import { useChat } from "../context/ChatContext";

const PRESETS = ["Is this room still available?","Can I schedule a visit tomorrow?","What is the security deposit?","Are all utilities included in rent?"];

export default function ChatScreen({ route, navigation }) {
  const { conversationId, roomId } = route.params || {};
  const user = useSelector((s)=>s.auth.user);
  const myEmail = (user?.email||"").toLowerCase();
  const { conversations, messages, activeConversationId, loadMessages, sendMessage, openConversation, startConversation } = useChat();
  const [inputText,setInputText]=useState("");
  const convId = conversationId || activeConversationId || null;
  const msgs = convId ? (messages[convId]||[]) : [];
  const flatRef=useRef(null);

  useEffect(()=>{
    if(convId) loadMessages(convId);
    else if(roomId) { /* will start on first send */ }
  },[convId,roomId]);

  async function handleSend(custom){
    const t=(custom||inputText).trim(); if(!t) return; setInputText("");
    if(convId) await sendMessage(convId,t);
    else if(roomId) { const conv=await startConversation(roomId,t); if(conv) navigation.setParams({conversationId:conv._id}); }
  }

  function renderItem({item}){
    const isMe=(item.senderEmail||"").toLowerCase()===myEmail;
    return (
      <View style={[styles.msgRow, isMe?styles.msgRowMe:styles.msgRowOther]}>
        <View style={[styles.bubble, isMe?styles.bubbleMe:styles.bubbleOther]}>
          <Text style={[styles.msgText, isMe?styles.msgTextMe:styles.msgTextOther]}>{item.text}</Text>
          <Text style={styles.msgTime}>{new Date(item.createdAt||Date.now()).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</Text>
        </View>
      </View>
    );
  }

  // If no active conversation, show conversations list (like website drawer list)
  if(!convId){
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <TouchableOpacity onPress={()=>navigation.goBack()} style={styles.backBtn}><Text style={styles.backBtnText}>← Back</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={{width:60}} />
        </View>
        <FlatList
          data={conversations}
          keyExtractor={(c)=>c._id}
          contentContainerStyle={{padding:16}}
          ListEmptyComponent={<View style={{alignItems:"center",marginTop:40}}><Text style={{color:"#64748b"}}>No conversations yet. Start from Room Details → Chat.</Text></View>}
          renderItem={({item})=>(
            <TouchableOpacity style={styles.convRow} onPress={()=>openConversation(item._id)}>
              <View style={styles.convAvatar}><Text style={{fontWeight:"900",color:"#7c3aed"}}>{(item.roomTitle||"R").charAt(0)}</Text></View>
              <View style={{flex:1}}>
                <Text style={{fontWeight:"800",color:"#0f172a"}} numberOfLines={1}>{item.roomTitle||"Room inquiry"}</Text>
                <Text style={{color:"#64748b",fontSize:12}} numberOfLines={1}>{item.lastMessage?.text||""}</Text>
              </View>
              {item.unreadCount?.[user?.email] ? <View style={{backgroundColor:"#7c3aed",borderRadius:10,paddingHorizontal:6,paddingVertical:2}}><Text style={{color:"#fff",fontSize:10,fontWeight:"900"}}>{item.unreadCount[user.email]}</Text></View> : null}
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={()=>navigation.goBack()}><Text style={styles.backBtnText}>← Back</Text></TouchableOpacity>
        <View style={styles.headerInfo}><Text style={styles.headerTitle} numberOfLines={1}>{conversations.find(c=>c._id===convId)?.roomTitle||"Chat"}</Text><Text style={styles.headerSub}>💬 Direct owner chat</Text></View>
        <View style={styles.liveIndicator}><View style={styles.onlineDot}/><Text style={styles.onlineText}>Online</Text></View>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined} style={{flex:1}}>
        <FlatList ref={flatRef} data={msgs} keyExtractor={(i)=>i._id||String(Math.random())} renderItem={renderItem} contentContainerStyle={styles.messagesList} onContentSizeChange={()=>flatRef.current?.scrollToEnd({animated:true})} />
        <View style={styles.presetSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
            {PRESETS.map((p,i)=>(<TouchableOpacity key={i} style={styles.presetChip} onPress={()=>handleSend(p)}><Text style={styles.presetText}>{p}</Text></TouchableOpacity>))}
          </ScrollView>
        </View>
        <View style={styles.inputBar}>
          <TextInput style={styles.input} placeholder="Type a message..." placeholderTextColor="#64748b" value={inputText} onChangeText={setInputText} onSubmitEditing={()=>handleSend()} returnKeyType="send" />
          <TouchableOpacity style={[styles.sendBtn, !inputText.trim()&&styles.sendBtnDisabled]} disabled={!inputText.trim()} onPress={()=>handleSend()}><Text style={styles.sendBtnText}>➤</Text></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({
  container:{flex:1,backgroundColor:"#f8fafc"},
  header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderColor:"#e2e8f0"},
  backBtn:{paddingVertical:6,paddingHorizontal:8},backBtnText:{color:"#7c3aed",fontSize:14,fontWeight:"700"},
  headerInfo:{flex:1,alignItems:"center",marginHorizontal:8},headerTitle:{color:"#0f172a",fontSize:15,fontWeight:"800"},headerSub:{color:"#94a3b8",fontSize:11,marginTop:1},
  liveIndicator:{flexDirection:"row",alignItems:"center",backgroundColor:"rgba(124,58,237,0.12)",paddingVertical:3,paddingHorizontal:8,borderRadius:10,gap:4},onlineDot:{width:6,height:6,borderRadius:3,backgroundColor:"#7c3aed"},onlineText:{color:"#7c3aed",fontSize:10,fontWeight:"800"},
  messagesList:{padding:16,gap:10},msgRow:{flexDirection:"row",marginBottom:6},msgRowMe:{justifyContent:"flex-end"},msgRowOther:{justifyContent:"flex-start"},bubble:{maxWidth:"80%",paddingVertical:10,paddingHorizontal:14,borderRadius:16},bubbleMe:{backgroundColor:"#7c3aed",borderBottomRightRadius:4},bubbleOther:{backgroundColor:"#ffffff",borderWidth:1,borderColor:"#e2e8f0",borderBottomLeftRadius:4},msgText:{fontSize:13,lineHeight:18},msgTextMe:{color:"#ffffff",fontWeight:"600"},msgTextOther:{color:"#0f172a"},msgTime:{fontSize:9,color:"rgba(100,116,139,0.8)",textAlign:"right",marginTop:4},
  presetSection:{borderTopWidth:1,borderColor:"#f1f5f9",paddingVertical:8},presetRow:{paddingHorizontal:14,gap:8},presetChip:{backgroundColor:"#f1f5f9",borderWidth:1,borderColor:"#e2e8f0",paddingVertical:6,paddingHorizontal:12,borderRadius:14},presetText:{color:"#0f172a",fontSize:11,fontWeight:"600"},
  inputBar:{flexDirection:"row",alignItems:"center",backgroundColor:"#ffffff",paddingHorizontal:12,paddingVertical:8,borderTopWidth:1,borderColor:"#e2e8f0",gap:10},input:{flex:1,backgroundColor:"#ffffff",borderWidth:1,borderColor:"#e2e8f0",borderRadius:20,paddingHorizontal:16,paddingVertical:10,color:"#0f172a",fontSize:13},sendBtn:{width:40,height:40,borderRadius:20,backgroundColor:"#7c3aed",alignItems:"center",justifyContent:"center"},sendBtnDisabled:{backgroundColor:"#cbd5e1"},sendBtnText:{color:"#ffffff",fontSize:16,fontWeight:"900"},
  convRow:{flexDirection:"row",alignItems:"center",gap:12,backgroundColor:"#fff",borderWidth:1,borderColor:"#e2e8f0",borderRadius:12,padding:12,marginBottom:10},convAvatar:{width:40,height:40,borderRadius:20,backgroundColor:"#ede9fe",alignItems:"center",justifyContent:"center"},
});
