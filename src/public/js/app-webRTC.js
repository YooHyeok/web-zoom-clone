const socket = io();

const myFace = document.getElementById("myFace")
const muteBtn = document.getElementById("mute")
const cameraBtn = document.getElementById("camera")
const camerasSelect = document.getElementById("cameras")

let myStream;
let muted = false;
let cameraOff = false;
let myPeerConnection;
/**
 * 카메라 목록 콤보 할당
 * enumerateDevices() : 컴퓨터 혹은 모바일이 가지고 있는 모든 장치를 알려준다.
 * 
 */
async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(device => device.kind === "videoinput")
    const currentCamera = myStream.getVideoTracks()[0] //현재 선택된 카메라 조회
    cameras.forEach(camera => {
      const option = document.createElement("option")
      option.value = camera.deviceId;
      option.innerText = camera.label
      if(currentCamera.label === camera.label) { // 현재 선택한 카메라 라벨과 일치하는 카메라에 selected옵션 추가
        option.selected = true;
      }
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
    if(!deviceId) await getCameras(); //데이터가 들어오지 않았을 경우에 목록 출력 (!undefined == true)
  } catch (error) {
    console.log(error)
  }
}

/**
 * 음소거 버튼 클릭 이벤트 핸들러 함수
 * @returns 
 */
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

/**
 * 카메라 전환 버튼 클릭 이벤트 핸들러 함수
 * @returns 
 */
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

/**
 * 카메라 변경 이벤트 핸들러 함수
 */
async function handleCameraChange() {
  await getMedia(camerasSelect.value)
}

muteBtn.addEventListener("click", handleMuteClick)
cameraBtn.addEventListener("click", handleCameraClick)
camerasSelect.addEventListener("input", handleCameraChange)

/* =========================== welcome form 시작 ===========================================================> */
const welcome = document.getElementById("welcome")
const welcomeForm = welcome.querySelector("form")
const call = document.getElementById("call")
call.hidden = true

let roomname;

/**
 * 영역 전환 효과 후 미디어 스트림 저장
 * welcome 영역 숨김
 * call 영역 숨김해제
*/
async function initCall() {
  welcome.hidden = true
  call.hidden = false
  await getMedia();
  makeConnection();
}

/**
 * Enter Room Btn 클릭 이벤트 함수
 * 입력란 방정보 데이터를 서버에 전송한다
 * 전송후 서버측에서 전달받은 콜백함수 startMedia를호출 
 * 영역을 전환함으로써 방 입장 효과를 준다
 * @param {*} event 
*/
async function handleWelcomeSubmit(event) {
  event.preventDefault();
  const input = this.querySelector("input")
  roomname = input.value;
  await initCall()
  socket.emit("join_room", roomname)
  input.value = ""
}
welcomeForm.addEventListener("submit", handleWelcomeSubmit)

/* =========================== Socket 시작 =================================================================> */

/**
 * [peer A]
 * peer A 정보, 입장 방 정보 서버로 전송
 * peer 연결 객체로부터 Offer 생성
 * 생성한 offer를 다시 peer연결 객체에 저장
 * 서버에 offer과 방이름 전송
 * offer가 주고 받아진 순간 직접적으로 대화가 가능해진다.
 * 
 * (가장 최초로 들어오는 peer는 SDP를 수집만 하고 offer 전송은 생략된다.)
 * 
 */
socket.on("welcome", async () => {
  console.log("someone Joined!")
  const offer = await myPeerConnection.createOffer(); // 수신자에게 전달할 SDP 생성
  myPeerConnection.setLocalDescription(offer) // signaling을 위한 SDP수집 (전역으로 저장함으로써 다른 피어 접속시 해당 변수를 통해 통신설정 협상)
  console.log("send the offer")
  socket.emit("offer", offer, roomname) // 서버에게 peer to peer signaling
})

/**
 * [peer B] A를 제외한 모든 peer 대상 (최초 입장 peer 포함)
 * peer A 정보 서버로부터 수신
 * setRemoteDescription
 * peer B 정보 모든 peer에게 전송
 */
socket.on("offer", async (offer)=>{
  myPeerConnection.setRemoteDescription(offer)
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer)
  socket.emit("answer", answer, roomname)
  console.log(answer)
})

/**
 * [peer A] B를 제외한 모든 peer 대상
 * B로 부터 받은 answer setRemoteDescription 작업
 */
socket.on("answer", async (answer)=>{
  myPeerConnection.setRemoteDescription(answer)
})

/* =========================== webRTC 시작 =================================================================> */

/**
 * 
 */
function makeConnection(){
  myPeerConnection = new RTCPeerConnection(); //peer to peer connection 생성
  myStream.getTracks()
  .forEach(track => myPeerConnection.addTrack(track, myStream)) // connection에 비디오, 오디오 stream 추가
}