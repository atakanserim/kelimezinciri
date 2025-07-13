            <!DOCTYPE html>
            <html lang="tr">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>Kelime Zinciri Çok Oyunculu</title>
              <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f4f7f6; color: #333; }
                h1 { text-align: center; color: #007bff; }
                label { display: block; margin-top: 10px; font-weight: bold; }
                input, select, button {
                  font-size: 16px;
                  padding: 10px;
                  margin: 8px 0;
                  width: 100%;
                  box-sizing: border-box;
                  border: 1px solid #ccc;
                  border-radius: 4px;
                }
                button {
                  background-color: #007bff;
                  color: white;
                  cursor: pointer;
                  border: none;
                  transition: background-color 0.3s ease;
                }
                button:hover { background-color: #0056b3; }
                button:disabled { background-color: #cccccc; cursor: not-allowed; }

                hr { border: 0; border-top: 1px solid #eee; margin: 20px 0; }

                #gameArea {
                  border: 1px solid #ddd;
                  padding: 15px;
                  border-radius: 8px;
                  background-color: #fff;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                #chainDisplay p { margin: 5px 0; padding: 5px; background-color: #e9ecef; border-radius: 4px; }
                #currentTurnDisplay { font-weight: bold; margin: 15px 0; padding: 8px; border-radius: 4px; text-align: center; }
                #roomLinkDisplay {
                  margin-top: 15px;
                  padding: 10px;
                  background-color: #d4edda;
                  border: 1px solid #28a745;
                  border-radius: 5px;
                  color: #155724;
                  word-break: break-all;
                }
                #joinRoomSection {
                  margin-top: 20px;
                  padding-top: 20px;
                  border-top: 1px dashed #ccc;
                }
              </style>
            </head>
            <body>

              <h1>Kelime Zinciri Çok Oyunculu</h1>

              <label for="username">Adınız:</label>
              <input type="text" id="username" placeholder="İsminiz" />

              <label for="team">Takım Seçin:</label>
              <select id="team">
                <option value="kirmizi">🔴 Kırmızı</option>
                <option value="mavi">🔵 M Aleppo
              </select>

              <button onclick="createRoom()">Yeni Oda Oluştur</button>

              <div id="joinRoomSection">
                <label for="joinRoomId">Oda ID ile Katıl:</label>
                <input type="text" id="joinRoomId" placeholder="Oda ID'si" />
                <button onclick="joinRoom()">Odaya Katıl</button>
              </div>

              <hr />

              <div id="gameArea" style="display:none;">
                <div id="roomLinkDisplay" style="display:none;"></div>
                <div id="currentTurnDisplay"></div>
                <div id="chainDisplay"></div>

                <label for="guessInput">Tahmininiz:</label>
                <input type="text" id="guessInput" placeholder="Kelimenin tamamını yazın" />
                <button onclick="handleGuess()">Tahmin Gönder</button>
              </div>

              <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"></script>
              <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js"></script>
              <script>
                const firebaseConfig = {
                  apiKey: "AIzaSyAakIndhM83k5tuXtuel5-WOCah0nqWrZ4",
                  authDomain: "kelime-zinciri-5c998.firebaseapp.com",
                  databaseURL: "https://kelime-zinciri-5c998-default-rtdb.europe-west1.firebasedatabase.app",
                  projectId: "kelime-zinciri-5c998",
                  storageBucket: "kelime-zinciri-5c998.firebasestorage.app",
                  messagingSenderId: "708438070367",
                  appId: "1:708438070367:web:5b0b9684b942aaa07477ea",
                  measurementId: "G-3HPZEZ93QJ"
                };

                firebase.initializeApp(firebaseConfig);
                const db = firebase.database();

                let roomId = null;
                let wordGraph = {};
                let guessHistory = [];
                let currentUser = {
                  username: '',
                  team: ''
                };
                // Mevcut aktif dinleyici referansını tutmak için
                let currentRoomRef = null;

                // --- Kelime Zinciri Oluşturma Fonksiyonları ---
                function createChain(wordGraph, startWord, length = 8) {
                  let chain = [startWord];
                  let currentWord = startWord;
                  let usedWords = new Set([startWord]); // Aynı kelimeyi tekrar kullanmamak için

                  for (let i = 1; i < length; i++) {
                    const nextWords = wordGraph[currentWord];
                    if (!nextWords || nextWords.length === 0) {
                      console.warn(`'${currentWord}' kelimesi için ilişkili kelime bulunamadı veya liste boş. Zincir burada kesildi. Uzunluk: ${chain.length}`);
                      break;
                    }

                    // Kullanılmamış ve çağrışımsal olarak bağlı kelimeleri filtrele
                    const availableWords = nextWords.filter(word => !usedWords.has(word));
                    if (availableWords.length === 0) {
                        console.warn(`'${currentWord}' kelimesi için kullanılabilecek başka benzersiz ilişkili kelime kalmadı. Zincir burada kesildi. Uzunluk: ${chain.length}`);
                        break;
                    }

                    currentWord = availableWords[Math.floor(Math.random() * availableWords.length)];
                    chain.push(currentWord);
                    usedWords.add(currentWord);
                  }
                  return chain;
                }

                function createChainWithRetries(wordGraph, length = 8, maxRetries = 50) {
                  const allWords = Object.keys(wordGraph);
                  if (allWords.length === 0) {
                    console.error("Kelime grafiği boş, zincir oluşturulamadı.");
                    return [];
                  }

                  for (let attempt = 0; attempt < maxRetries; attempt++) {
                    const startWord = allWords[Math.floor(Math.random() * allWords.length)];
                    const chain = createChain(wordGraph, startWord, length);

                    if (chain.length === length) {
                      console.log(`Deneme ${attempt + 1}: Zincir başarıyla oluşturuldu:`, chain);
                      return chain;
                    }
                  }

                  // Maksimum denemeye rağmen istenen uzunlukta zincir oluşturulamazsa
                  // rastgele bir başlangıç kelimesiyle oluşturulmuş en iyi zinciri döndür.
                  const fallbackStartWord = allWords[Math.floor(Math.random() * allWords.length)];
                  const fallbackChain = createChain(wordGraph, fallbackStartWord, length);
                  console.warn(`Max ${maxRetries} denemede ${length} uzunluğunda zincir oluşturulamadı. Yedek zincir kullanılıyor:`, fallbackChain);
                  return fallbackChain;
                }

                // --- Firebase ve Oyun Mantığı ---
                function initializeUser() {
                    currentUser.username = document.getElementById('username').value.trim();
                    currentUser.team = document.getElementById('team').value;

                    if (!currentUser.username) {
                        alert("Lütfen adınızı girin.");
                        return false;
                    }
                    return true;
                }

                async function createRoom() {
                  if (!initializeUser()) return;

                  if (!wordGraph || Object.keys(wordGraph).length === 0) {
                    alert("Kelime grafiği henüz yüklenmedi veya boş. Lütfen sayfayı yenileyin ve wordGraph_2000.json dosyasını kontrol edin.");
                    return;
                  }

                  // **Önemli:** Her zaman yeni ve benzersiz bir oda ID'si oluştur
                  roomId = "room_" + Date.now(); 

                  // Mevcut Firebase dinleyicisini kapat (varsa)
                  if (currentRoomRef) {
                      currentRoomRef.off();
                  }

                  const chain = createChainWithRetries(wordGraph, 8);
                  if (chain.length === 0) {
                      alert("Kelime zinciri oluşturulamadı. Lütfen wordGraph_2000.json dosyanızın geçerli ilişkiler içerdiğinden emin olun.");
                      return;
                  }

                  const hiddenChain = chain.map((w, i) => i === 0 ? w : w[0] + '.'.repeat(w.length - 1));

                  try {
                      // **Önemli:** Oda oluşturulurken, Firebase'de o odaya ait tüm veriyi temizle.
                      // Bu, her yeni oyunun sıfırdan başlamasını sağlar.
                      await db.ref(`rooms/${roomId}`).remove(); 

                      await db.ref(`rooms/${roomId}/gameState`).set({
                          chain: hiddenChain,
                          originalChain: chain, // Doğru kelimeleri sakla
                          currentTurn: "kirmizi", // Oyunu her zaman Kırmızı takımla başlat
                          status: "playing",
                          correctGuessesCount: 0 // Kaç kelimenin doğru tahmin edildiğini takip et
                      });

                      await db.ref(`rooms/${roomId}/players/${currentUser.username}`).set({
                          team: currentUser.team
                      });

                      updateGameUI(roomId);
                      listenGame(roomId);
                      alert(`Yeni oda oluşturuldu! Oda ID: ${roomId}. Linki arkadaşlarınla paylaş!`);
                  } catch (error) {
                      console.error("Oda oluşturulurken hata:", error);
                      alert("Oda oluşturulamadı: " + error.message);
                  }
                }

                async function joinRoom() {
                  if (!initializeUser()) return;

                  const inputRoomId = document.getElementById('joinRoomId').value.trim();
                  if (!inputRoomId) {
                      alert("Lütfen katılmak istediğiniz oda ID'sini girin.");
                      return;
                  }

                  // Mevcut Firebase dinleyicisini kapat (varsa)
                  if (currentRoomRef) {
                      currentRoomRef.off();
                  }

                  try {
                      const snapshot = await db.ref(`rooms/${inputRoomId}/gameState`).once('value');
                      if (snapshot.exists()) {
                          roomId = inputRoomId;
                          // Oyuncuyu odaya ekle
                          await db.ref(`rooms/${roomId}/players/${currentUser.username}`).set({
                              team: currentUser.team
                          });
                          updateGameUI(roomId);
                          listenGame(roomId);
                          alert(`Odaya katıldınız! Oda ID: ${roomId}`);
                      } else {
                          alert("Böyle bir oda bulunamadı.");
                      }
                  } catch (error) {
                      console.error("Odaya katılırken hata:", error);
                      alert("Odaya katılamadı: " + error.message);
                  }
                }

                function updateGameUI(currentRoomId) {
                    document.getElementById('gameArea').style.display = 'block';
                    const roomLinkDisplay = document.getElementById('roomLinkDisplay');
                    const roomLink = window.location.origin + window.location.pathname + `?room=${currentRoomId}`;
                    roomLinkDisplay.innerHTML = `Oda linki: <a href="${roomLink}" target="_blank">${roomLink}</a>`;
                    roomLinkDisplay.style.display = 'block';

                    // URL'ye oda ID'sini ekle
                    if (history.pushState) {
                        const newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?room=' + currentRoomId;
                        window.history.pushState({path: newurl}, '', newurl);
                    }
                }

                function listenGame(currentRoomId) {
                  // Yeni dinleyiciyi başlat ve referansı kaydet
                  currentRoomRef = db.ref(`rooms/${currentRoomId}/gameState`);
                  currentRoomRef.on('value', snapshot => {
                    const game = snapshot.val();
                    if (!game) return;

                    renderChain(game.chain);
                    updateTurnUI(game.currentTurn);

                    if (game.status === "finished") {
                      alert("Oyun bitti! Kazanan: " + (game.currentTurn === "kirmizi" ? "🔴 Kırmızı Takım" : "🔵 Mavi Takım"));
                      document.getElementById('guessInput').disabled = true;
                      document.querySelector('#gameArea button').disabled = true;
                    } else {
                      // Sadece sırası olan oyuncu tahmin yapabilir
                      const isMyTurn = (currentUser.team === game.currentTurn);
                      document.getElementById('guessInput').disabled = !isMyTurn;
                      document.querySelector('#gameArea button').disabled = !isMyTurn;
                    }
                  });
                }

                function renderChain(chain) {
                  const container = document.getElementById('chainDisplay');
                  container.innerHTML = '';
                  chain.forEach((word, i) => {
                    const p = document.createElement('p');
                    p.textContent = `${i + 1}. ${word}`;
                    container.appendChild(p);
                  });
                }

                function updateTurnUI(currentTurn) {
                  const currentTurnDiv = document.getElementById('currentTurnDisplay');
                  if (!currentTurn) {
                    currentTurnDiv.textContent = "";
                    return;
                  }
                  const teamName = currentTurn === "kirmizi" ? "🔴 Kırmızı Takım" : "🔵 Mavi Takım";
                  const teamColor = currentTurn === "kirmizi" ? "#d63333" : "#264de4";

                  currentTurnDiv.textContent = `Şu an oynayan takım: ${teamName}`;
                  currentTurnDiv.style.color = teamColor;
                }

                function handleGuess() {
                  const guessInput = document.getElementById('guessInput');
                  const guess = guessInput.value.trim().toLowerCase();

                  if (!guess) {
                    alert("Tahmin boş olamaz.");
                    return;
                  }
                  if (!roomId) {
                    alert("Önce oyuna katılın veya yeni bir oda oluşturun!");
                    return;
                  }

                  db.ref(`rooms/${roomId}/gameState`).transaction(game => {
                    if (game && game.status === "playing") {
                      // Sıranın doğru oyuncuda olduğundan emin ol
                      if (currentUser.team !== game.currentTurn) {
                        alert("Sizin sıranız değil!");
                        return; // İşlemi iptal et
                      }

                      let nextIndex = -1;
                      // Hangi kelimenin tahmin edilmesi gerektiğini bul
                      // İlk kelime zaten açık olduğundan 1. indexten başla (2. kelime)
                      for (let i = 1; i < game.originalChain.length; i++) {
                          if (game.chain[i] && game.chain[i].includes('.')) {
                              nextIndex = i;
                              break;
                          }
                      }

                      if (nextIndex === -1) {
                        alert("Tüm kelimeler zaten açılmış!");
                        return; // İşlemi iptal et
                      }

                      const correctWord = game.originalChain[nextIndex].toLowerCase();

                      // Tahmin kelimesinin ilk harfinin doğru kelimenin ilk harfiyle eşleştiğini kontrol et
                      const expectedFirstLetter = game.originalChain[nextIndex].charAt(0).toLowerCase();
                      if (guess.charAt(0).toLowerCase() !== expectedFirstLetter) {
                        alert(`Tahmin kelimesi '${expectedFirstLetter}' harfi ile başlamalı.`);
                        game.currentTurn = (game.currentTurn === "kirmizi" ? "mavi" : "kirmizi"); // Sırayı değiştir
                        return game; // İşlemi güncelle ve geri dön
                      }

                      if (guess === correctWord) {
                        game.chain[nextIndex] = correctWord; // Kelimeyi açığa çıkar
                        game.correctGuessesCount++;

                        if (game.correctGuessesCount === game.originalChain.length - 1) { // Zincirdeki ilk kelime zaten açık olduğundan -1
                          game.status = "finished";
                          // Kazananı belirtmek için currentTurn'ı sabit bırak
                        } else {
                          // Doğru tahmin, sıra aynı takımda kalır
                          alert("Doğru tahmin! Sıradaki kelime için tahmin etmeye devam edin.");
                        }
                      } else {
                        // Yanlış tahmin: sıra diğer takıma geçer
                        alert("Yanlış tahmin! Sıra diğer takıma geçti.");
                        game.currentTurn = (game.currentTurn === "kirmizi" ? "mavi" : "kirmizi");
                      }
                    }
                    guessInput.value = ""; // Inputu temizle
                    return game; // Güncellenmiş oyun durumunu döndür
                  }).catch(error => {
                      console.error("Tahmin gönderilirken hata:", error);
                      // Hata durumunda kullanıcıya bilgi verilebilir
                  });
                }

                // Sayfa yüklendiğinde URL'deki oda ID'sini kontrol et ve Enter tuşu olay dinleyicisini ekle
                document.addEventListener('DOMContentLoaded', () => {
                  // URL'deki oda ID'sini kontrol et
                  const urlParams = new URLSearchParams(window.location.search);
                  const roomFromUrl = urlParams.get('room');
                  if (roomFromUrl) {
                      document.getElementById('joinRoomId').value = roomFromUrl;
                      alert(`URL'den oda ID'si alındı: ${roomFromUrl}. Lütfen adınızı ve takımınızı seçip 'Odaya Katıl' butonuna tıklayın.`);
                  }

                  // Enter tuşuyla tahmin gönderme
                  const guessInput = document.getElementById('guessInput');
                  if (guessInput) {
                    guessInput.addEventListener('keypress', function(event) {
                      if (event.key === 'Enter') {
                        event.preventDefault(); // Varsayılan form davranışını engelle
                        if (typeof handleGuess === 'function') {
                          handleGuess(); // Tahmin fonksiyonunu çağır
                        } else {
                          console.error("Hata: handleGuess fonksiyonu tanımlı değil!");
                          alert("Hata: handleGuess fonksiyonu bulunamadı. Lütfen kodu kontrol edin.");
                        }
                      }
                    });
                  } else {
                    console.error("Hata: guessInput elementi bulunamadı!");
                    alert("Hata: guessInput elementi bulunamadı. HTML kodunu kontrol edin.");
                  }
                });

                // Kelime grafiği JSON dosyasını yükle
                fetch('wordGraph.json')
                  .then(res => {
                      if (!res.ok) {
                          throw new Error(`HTTP hata! Durum: ${res.status}`);
                      }
                      return res.json();
                  })
                  .then(data => {
                    wordGraph = data;
                    console.log("Kelime grafiği başarıyla yüklendi. Toplam kelime sayısı:", Object.keys(wordGraph).length);
                    if (Object.keys(wordGraph).length === 0) {
                        alert("Kelime grafiği boş yüklendi. wordGraph_2000.json dosyanızda kelime ve ilişki tanımları olduğundan emin olun.");
                    }
                  })
                  .catch(err => {
                    console.error("Kelime grafiği yükleme hatası:", err);
                    alert("Kelime grafiği yüklenemedi! wordGraph_2000.json dosyasının doğru yolda olduğundan ve geçerli bir JSON formatında olduğundan emin olun.");
                  });
              </script>
            </body>
            </html>