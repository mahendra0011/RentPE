import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Gyroscope } from "expo-sensors";
import { useFonts } from "expo-font";

const { width } = Dimensions.get("window");
const GREEN = "#00E676";

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState("back");
  const [mode, setMode] = useState("capture");
  const [holding, setHolding] = useState(false);
  const [yaw, setYaw] = useState(0);
  const [activeDot, setActiveDot] = useState(5);
  const cameraRef = useRef(null);
  const [fontsLoaded] = useFonts({ "Inter-Regular": require("./assets/Inter-Regular.ttf") });

  useEffect(() => {
    const sub = Gyroscope.addListener(({ y }) => setYaw((p) => (p + y * 8) % 360));
    Gyroscope.setUpdateInterval(80);
    return () => sub.remove();
  }, []);
  useEffect(() => setActiveDot(Math.abs(Math.round((yaw % 360) / 30)) % 9), [yaw]);

  if (!permission) return <View style={styles.center}><Text>Loading...</Text></View>;
  if (!permission.granted) return <SafeAreaView style={styles.center}><Text style={{ fontWeight:"900", marginBottom:12 }}>Camera needed</Text><TouchableOpacity style={styles.btn} onPress={requestPermission}><Text style={styles.btnText}>Grant</Text></TouchableOpacity></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}><Text style={styles.title}>360 Photo Cam</Text><Text style={styles.sub}>100% same as base — RentPe theme #7c3aed</Text></View>
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, mode==="capture"&&styles.tabActive]} onPress={()=>setMode("capture")}><Text style={[styles.tabText, mode==="capture"&&styles.tabTextActive]}>Capture</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.tab, mode==="viewer"&&styles.tabActive]} onPress={()=>setMode("viewer")}><Text style={[styles.tabText, mode==="viewer"&&styles.tabTextActive]}>Viewer</Text></TouchableOpacity>
      </View>
      {mode==="capture" ? (
        <View style={styles.captureRoot}>
          <View style={styles.topBlack}>
            <TouchableOpacity style={styles.flipBtn} onPress={()=>setFacing(f=>f==="back"?"front":"back")}><Text style={{ color:"#fff", fontWeight:"900", fontSize:10 }}>{facing==="back"?"FRONT":"BACK"}</Text></TouchableOpacity>
            <View style={[styles.whiteCircle, { transform:[{ rotate:`${yaw}deg` }] }]}><View style={styles.arrowTri} /></View>
          </View>
          <View style={styles.cameraWrap}>
            <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
            <View style={styles.overlayRect}><View style={styles.greenRect}><View style={styles.whiteCircleOverlay}>{!holding ? <View style={styles.whiteCircleInner}/> : <View style={styles.holdBtn}><View style={styles.holdRing}><Text style={styles.holdText}>HOLD</Text></View></View>}</View></View></View>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPressIn={()=>setHolding(true)} onPressOut={()=>setHolding(false)} />
          </View>
          <View style={styles.bottomDots}>
            <View style={{ alignItems:"center", gap:6 }}>
              <View style={styles.dotRow}><View style={[styles.dot,{backgroundColor:GREEN}]} /></View>
              <View style={styles.dotRow}>{Array.from({length:7}).map((_,i)=><View key={i} style={[styles.dot,{backgroundColor:GREEN}]} />)}</View>
              <View style={styles.dotRow}>{Array.from({length:13}).map((_,i)=><View key={i} style={[styles.dot,{backgroundColor:i===activeDot?"#fff":GREEN,borderWidth:i===activeDot?2:0,borderColor:"#fff"}]} />)}</View>
              <View style={styles.dotRow}>{Array.from({length:8}).map((_,i)=><View key={i} style={[styles.dot,{backgroundColor:i===4?"#fff":GREEN}]} />)}<View style={[styles.dot,{backgroundColor:GREEN,marginLeft:8}]} /></View>
            </View>
            <TouchableOpacity style={styles.closeX} onPress={()=>setMode("viewer")}><Text style={{color:"#fff",fontSize:18}}>✕</Text></TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.viewerWrap}><Image source={require("./assets/base/frame_20.jpg")} style={{ flex:1, width:"100%" }} resizeMode="cover" /><TouchableOpacity style={[styles.btn,{position:"absolute",bottom:20,alignSelf:"center"}]} onPress={()=>setMode("capture")}><Text style={styles.btnText}>Back to Capture</Text></TouchableOpacity></View>
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#000" }, center:{ flex:1, alignItems:"center", justifyContent:"center", backgroundColor:"#000" },
  header:{ padding:16, borderBottomWidth:1, borderColor:"#e2e8f0", backgroundColor:"#fff" }, title:{ fontSize:20, fontWeight:"900", color:"#0f172a" }, sub:{ fontSize:11, color:"#7c3aed", fontWeight:"700", marginTop:2 },
  tabRow:{ flexDirection:"row", gap:8, padding:8, backgroundColor:"#0f172a" }, tab:{ flex:1, paddingVertical:8, borderRadius:10, backgroundColor:"#1e293b", alignItems:"center" }, tabActive:{ backgroundColor:"#7c3aed" }, tabText:{ fontWeight:"800", color:"#94a3b8" }, tabTextActive:{ color:"#fff" },
  captureRoot:{ flex:1, backgroundColor:"#000" }, topBlack:{ flex:0.45, backgroundColor:"#000", alignItems:"center", justifyContent:"center", position:"relative" }, flipBtn:{ position:"absolute", top:12, right:12, backgroundColor:"#1e293b", paddingVertical:6, paddingHorizontal:10, borderRadius:12, borderWidth:1, borderColor:"#334155" },
  whiteCircle:{ width:90, height:90, borderRadius:45, backgroundColor:"#fff", alignItems:"center", justifyContent:"center" }, arrowTri:{ position:"absolute", top:-14, width:0, height:0, borderLeftWidth:10, borderRightWidth:10, borderBottomWidth:18, borderLeftColor:"transparent", borderRightColor:"transparent", borderBottomColor:"#fff" },
  cameraWrap:{ flex:1, position:"relative", backgroundColor:"#000" }, camera:{ flex:1 }, overlayRect:{ ...StyleSheet.absoluteFillObject, alignItems:"center", justifyContent:"center" },
  greenRect:{ width: width*0.62, height: width*0.62*1.25, backgroundColor:"rgba(0,230,118,0.85)", borderWidth:2, borderColor:"#fff", alignItems:"center", justifyContent:"center" },
  whiteCircleOverlay:{ width:90, height:90, borderRadius:45, backgroundColor:"rgba(255,255,255,0.9)", alignItems:"center", justifyContent:"center", borderWidth:2, borderColor:"#fff" }, whiteCircleInner:{ width:70, height:70, borderRadius:35, backgroundColor:"#fff" },
  holdBtn:{ width:80, height:80, borderRadius:40, backgroundColor:"rgba(255,255,255,0.9)", alignItems:"center", justifyContent:"center" }, holdRing:{ width:64, height:64, borderRadius:32, borderWidth:4, borderColor:GREEN, alignItems:"center", justifyContent:"center", backgroundColor:"#fff" }, holdText:{ fontWeight:"900", color:"#0f172a", fontSize:12 },
  bottomDots:{ flex:0.55, backgroundColor:"#000", alignItems:"center", justifyContent:"center", paddingBottom:20 }, dotRow:{ flexDirection:"row", gap:6, justifyContent:"center" }, dot:{ width:8, height:8, borderRadius:4 }, closeX:{ position:"absolute", left:16, bottom:16, width:28, height:28, alignItems:"center", justifyContent:"center" },
  viewerWrap:{ flex:1, backgroundColor:"#000", alignItems:"center", justifyContent:"center" }, btn:{ backgroundColor:"#7c3aed", paddingVertical:12, paddingHorizontal:20, borderRadius:12, marginTop:12 }, btnText:{ color:"#fff", fontWeight:"900" },
});
