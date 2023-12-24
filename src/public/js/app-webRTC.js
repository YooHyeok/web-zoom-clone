const socket = io();

const myFace = document.getElementById("myFace")
const muteBtn = document.getElementById("mute")
const cameraBtn = document.getElementById("camera")
const camerasSelect = document.getElementById("cameras")

let myStream;
let muted = false;
let cameraOff = false;

/**
 * 카메라 목록 콤보 할당
 * enumerateDevices() : 컴퓨터 혹은 모바일이 가지고 있는 모든 장치를 알려준다.
 * 
 */
async function getCameras() {
  try {
    const devices = navigator.mediaDevices.enumerateDevices();
    const cameras = (await devices).filter(device => device.kind === "videoinput")
    cameras.forEach(camera => {
      const option = document.createElement("option")
      option.value = camera.deviceId;
      option.innerText = camera.label
      camerasSelect.appendChild(option)
    })
  } catch (error) {
    console.log(error)
  }
}

/**
 * 미디어 스트림 비디오 할당
 * getUserMedia() : 컴퓨터 혹은 모바일이 가지고 있는 미디어 스트림을 알려준다.
 * 
 */
async function getMedia(deviceId) {

  const initialConstraints = {
    audio: true,
    video: { facingMode: "user" }
  }

  const cameraConstraints = {
    audio: true,
    video: { deviceId: { exact: deviceId } } // exact옵션 : 해당 id가 없다면 다른 카메라를 자동으로 연결하지 않고 출력하지않는다.
  }
  try {
    myFace.srcObject = myStream;
    myStream = await navigator.mediaDevices.getUserMedia(deviceId? cameraConstraints: initialConstraints)
    myFace.srcObject = myStream;
    console.log(!deviceId)
    if(!deviceId) await getCameras(); //데이터가 들어오지 않았을 경우에 목록 출력 (!undefined == true)
  } catch (error) {
    console.log(error)
  }
}
getMedia();

function handleMuteClick() {
  myStream.getAudioTracks().forEach(track=>{
    track.enabled = !track.enabled
  })
  if(!muted) {
    muteBtn.innerText = "UnMute"
    muted = !muted
    return
  }
  muteBtn.innerText = "Mute"
  muted = !muted
}

function handleCameraClick() {
  myStream.getVideoTracks().forEach(track=>{
    console.log(track)
    track.enabled = !track.enabled
  })
  if(!cameraOff) {
    cameraBtn.innerText = "Turn Camera On"
    cameraOff = !cameraOff
    return
  }
  cameraBtn.innerText = "Turn Camera Off"
  cameraOff = !cameraOff

}

async function handleCameraChange() {
  await getMedia(camerasSelect.value)
}

muteBtn.addEventListener("click", handleMuteClick)
cameraBtn.addEventListener("click", handleCameraClick)
camerasSelect.addEventListener("input", handleCameraChange)