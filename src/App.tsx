import React, { useState, useEffect } from 'react';
import { RefreshCw, Trophy, HelpCircle, ArrowUp, ArrowDown, Loader2, AlertTriangle } from 'lucide-react';
import * as Papa from 'papaparse';

// Google Sheets'ten "Web'de Yayınla > CSV" ile alınan link
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSe8bmnxWlI6ohyOpKOorv-hntnimuz1ePhEt5H_VQYjOa_q7vpohcxezh0Bb9FwdO26eHGmOdH4tLy/pub?output=csv';

type Character = {
  name: string;
  gender: string;
  race: string;
  weapon: string;
  region: string;
  powerLevel: number;
  plane: string;
  image?: string;
};

type GuessResult = {
  character: Character;
  matches: {
    gender: 'full' | 'partial' | 'none';
    race: 'full' | 'partial' | 'none';
    weapon: 'full' | 'partial' | 'none';
    region: 'full' | 'partial' | 'none';
    plane: 'full' | 'partial' | 'none';
    powerLevel: 'correct' | 'higher' | 'lower';
  };
};

export default function LoldleGame() {
  const [characterData, setCharacterData] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [targetCharacter, setTargetCharacter] = useState<Character | null>(null);
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [gameWon, setGameWon] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const loadData = () => {
    setLoading(true);
    setLoadError(null);

    // Cache-bust ekleyerek her seferinde güncel veriyi çekmeye çalışıyoruz
    const urlWithCacheBust = `${SHEET_CSV_URL}${SHEET_CSV_URL.includes('?') ? '&' : '?'}cb=${Date.now()}`;

    Papa.parse(urlWithCacheBust, {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimitersToGuess: [',', '\t', ';'],
      complete: (results: any) => {
        try {
          const rows = (results.data as any[]).filter((r) => r && r.name && String(r.name).trim() !== '');

          const parsed: Character[] = rows.map((row) => {
            const clean: any = {};
            Object.keys(row).forEach((key) => {
              const cleanKey = key.trim();
              clean[cleanKey] = typeof row[key] === 'string' ? row[key].trim() : row[key];
            });

            return {
              name: String(clean.name ?? '').trim(),
              gender: String(clean.gender ?? 'Belirsiz').trim(),
              race: String(clean.race ?? 'Belirsiz').trim(),
              weapon: String(clean.weapon ?? 'Belirsiz').trim(),
              region: String(clean.region ?? 'Belirsiz').trim(),
              powerLevel: Number(clean.powerLevel) || 0,
              plane: String(clean.plane ?? 'Belirsiz').trim(),
              image: clean.image ? String(clean.image).trim() : '',
            };
          });

          if (parsed.length === 0) {
            setLoadError('Sheet\'te karakter bulunamadı. Sütun başlıklarını kontrol edin (name, gender, race, weapon, region, powerLevel, plane, image).');
          } else {
            setCharacterData(parsed);
          }
        } catch (err) {
          setLoadError('Veri işlenirken bir hata oluştu.');
        } finally {
          setLoading(false);
        }
      },
      error: () => {
        setLoadError('Sheet verisine ulaşılamadı. Linkin "Web\'de Yayınla > CSV" ile doğru yayınlandığından emin olun.');
        setLoading(false);
      },
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (characterData.length > 0 && !targetCharacter) {
      startNewGame();
    }
  }, [characterData]);

  const startNewGame = () => {
    if (characterData.length > 0) {
      const randomChar = characterData[Math.floor(Math.random() * characterData.length)];
      setTargetCharacter(randomChar);
      setGuesses([]);
      setGameWon(false);
      setSearchTerm('');
      setSelectedIndex(0);
    }
  };

  const checkPartialMatch = (guess: string, target: string): 'full' | 'partial' | 'none' => {
    if (guess === target) return 'full';

    const guessParts = guess.toLowerCase().split('/');
    const targetParts = target.toLowerCase().split('/');

    for (const gPart of guessParts) {
      for (const tPart of targetParts) {
        if (gPart.trim() === tPart.trim()) return 'partial';
      }
    }

    return 'none';
  };

  const handleGuess = (character: Character) => {
    if (!targetCharacter || gameWon) return;

    let powerStatus: 'correct' | 'higher' | 'lower' = 'correct';
    if (character.powerLevel < targetCharacter.powerLevel) powerStatus = 'higher';
    if (character.powerLevel > targetCharacter.powerLevel) powerStatus = 'lower';

    const matches = {
      gender: checkPartialMatch(character.gender, targetCharacter.gender),
      race: checkPartialMatch(character.race, targetCharacter.race),
      weapon: checkPartialMatch(character.weapon, targetCharacter.weapon),
      region: checkPartialMatch(character.region, targetCharacter.region),
      plane: checkPartialMatch(character.plane, targetCharacter.plane),
      powerLevel: powerStatus,
    };

    const newGuess: GuessResult = { character, matches };
    setGuesses([newGuess, ...guesses]);
    setSearchTerm('');
    setSelectedIndex(0);

    if (character.name === targetCharacter.name) {
      setGameWon(true);
    }
  };

  const filteredCharacters = characterData.filter(
    (char) =>
      char.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !guesses.some((g) => g.character.name === char.name)
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredCharacters.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < Math.min(filteredCharacters.length - 1, 9) ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCharacters[selectedIndex]) {
        handleGuess(filteredCharacters[selectedIndex]);
      }
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  const getMatchColor = (match: 'full' | 'partial' | 'none') => {
    if (match === 'full') return 'bg-green-600 border-green-500';
    if (match === 'partial') return 'bg-orange-500 border-orange-400';
    return 'bg-red-600 border-red-500';
  };

  const themeClass = isDarkMode
    ? 'bg-gray-900 text-white'
    : 'bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 text-gray-900';

  return (
    <div className={`min-h-screen p-4 transition-colors duration-300 ${themeClass}`} style={{ fontFamily: '"Cinzel", "Trajan Pro", serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=MedievalSharp&display=swap');
      `}</style>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 pt-8">
          <h1 className={`text-5xl font-black mb-3 tracking-widest ${isDarkMode ? 'text-amber-500' : 'text-amber-700'}`} style={{
            fontFamily: '"MedievalSharp", "Cinzel", serif',
            textShadow: isDarkMode
              ? '2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(245,158,11,0.5)'
              : '2px 2px 4px rgba(0,0,0,0.3), 0 0 10px rgba(245,158,11,0.3)'
          }}>
            KENANTADLE
          </h1>
          <p className={`text-base ${isDarkMode ? 'text-amber-200' : 'text-amber-800'}`} style={{ fontFamily: '"Cinzel", serif' }}>
            Günün Kenanta karakterini tahmin et!
          </p>
        </div>

        <div className="flex gap-3 justify-center mb-8 flex-wrap">
          <button
            onClick={startNewGame}
            disabled={loading || characterData.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed ${
              isDarkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            <RefreshCw size={16} />
            YENİLE
          </button>
          <button
            onClick={() => setShowRules(!showRules)}
            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors text-sm font-bold ${
              isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
            }`}
          >
            <HelpCircle size={16} />
            NASIL?
          </button>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors text-sm font-bold ${
              isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
            }`}
          >
            {isDarkMode ? '☀️' : '🌙'}
            {isDarkMode ? 'LIGHT' : 'DARK'}
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors text-sm font-bold disabled:opacity-50 ${
              isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
            }`}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            VERİYİ YENİLE
          </button>
        </div>

        {loading && (
          <div className={`flex flex-col items-center justify-center py-16 gap-3 ${isDarkMode ? 'text-amber-200' : 'text-amber-800'}`}>
            <Loader2 size={40} className="animate-spin" />
            <p>Karakterler yükleniyor...</p>
          </div>
        )}

        {!loading && loadError && (
          <div className={`rounded-lg p-6 mb-8 border flex items-start gap-3 ${
            isDarkMode ? 'bg-red-900/40 border-red-600 text-red-200' : 'bg-red-50 border-red-400 text-red-800'
          }`}>
            <AlertTriangle size={24} className="flex-shrink-0 mt-1" />
            <div>
              <p className="font-bold mb-1">Veri yüklenemedi</p>
              <p className="text-sm">{loadError}</p>
              <button
                onClick={loadData}
                className="mt-3 text-sm underline font-bold"
              >
                Tekrar dene
              </button>
            </div>
          </div>
        )}

        {!loading && !loadError && (
          <>
            {showRules && (
              <div className={`rounded-lg p-6 mb-8 border ${
                isDarkMode ? 'bg-gray-800 border-purple-500' : 'bg-white border-amber-400 shadow-lg'
              }`}>
                <h3 className={`text-xl font-bold mb-3 ${isDarkMode ? 'text-purple-400' : 'text-amber-700'}`}>
                  Nasıl Oynanır?
                </h3>
                <ul className={`space-y-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• Gizli karakteri tahmin etmeye çalışın</li>
                  <li>• <span className="text-green-600 font-bold">Yeşil</span> = Tam eşleşme</li>
                  <li>• <span className="text-orange-500 font-bold">Turuncu</span> = Kısmi eşleşme (örn: İnsan/Lanetli içinde İnsan var)</li>
                  <li>• <span className="text-red-600 font-bold">Kırmızı</span> = Yanlış</li>
                  <li>• Power Level için ok işaretleri: Yukarı = hedef daha güçlü, Aşağı = hedef daha zayıf</li>
                  <li>• Yukarı/Aşağı ok tuşlarıyla önerilerde gezinip Enter ile tahmin edebilirsiniz</li>
                  <li>• Tüm özellikler tam eşleştiğinde kazanırsınız!</li>
                </ul>
              </div>
            )}

            {gameWon && (
              <div className={`rounded p-4 mb-6 text-center ${isDarkMode ? 'bg-green-600' : 'bg-green-500 shadow-lg'}`}>
                <Trophy className="inline-block mb-1 mr-2 text-white" size={24} />
                <span className="text-xl font-bold text-white">
                  TEBRİKLER! {targetCharacter?.name} bulundu! ({guesses.length} tahminde)
                </span>
              </div>
            )}

            {!gameWon && targetCharacter && (
              <div className="mb-6 relative max-w-xl mx-auto">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Karakter adı yaz..."
                  className={`w-full border rounded p-3 focus:outline-none transition-colors ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-600 text-white focus:border-purple-500'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-amber-500 shadow'
                  }`}
                />
                {searchTerm && filteredCharacters.length > 0 && (
                  <div className={`absolute w-full z-10 mt-1 border rounded max-h-60 overflow-y-auto shadow-xl ${
                    isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
                  }`}>
                    {filteredCharacters.slice(0, 10).map((char, idx) => (
                      <button
                        key={char.name}
                        onClick={() => handleGuess(char)}
                        className={`w-full px-4 py-3 text-left transition-colors border-b last:border-0 ${
                          isDarkMode
                            ? `border-gray-700 ${idx === selectedIndex ? 'bg-purple-600 text-white' : 'hover:bg-gray-700'}`
                            : `border-gray-200 ${idx === selectedIndex ? 'bg-amber-500 text-white' : 'hover:bg-gray-100'}`
                        }`}
                      >
                        {char.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {guesses.length > 0 && (
              <div className={`grid grid-cols-7 gap-1 mb-2 text-center text-sm font-bold uppercase tracking-wider p-3 rounded-lg border-2 shadow-lg ${
                isDarkMode
                  ? 'bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 border-amber-700 text-amber-200'
                  : 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 border-amber-400 text-white'
              }`}>
                <div>Karakter</div>
                <div>Cinsiyet</div>
                <div>Irk</div>
                <div>Silah</div>
                <div>Bölge</div>
                <div>Güç</div>
                <div>Düzlem</div>
              </div>
            )}

            <div className="space-y-2">
              {guesses.map((guess, idx) => (
                <div key={idx} className="grid grid-cols-7 gap-1">

                  <div className={`border p-3 flex items-center justify-center rounded overflow-hidden relative ${
                    isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300 shadow'
                  }`}
                    style={guess.character.image ? {
                      backgroundImage: `url(${guess.character.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    } : {}}
                  >
                    {guess.character.image && (
                      <div className="absolute inset-0 backdrop-blur-sm bg-black/40" />
                    )}
                    <span className="font-bold text-base text-center relative z-10 text-white" style={
                      !guess.character.image ? { color: isDarkMode ? 'white' : '#1f2937' } : {}
                    }>
                      {guess.character.name}
                    </span>
                  </div>

                  <div className={`p-2 flex items-center justify-center rounded border ${getMatchColor(guess.matches.gender)}`}>
                    <span className="text-base font-bold text-center text-white">{guess.character.gender}</span>
                  </div>

                  <div className={`p-2 flex items-center justify-center rounded border ${getMatchColor(guess.matches.race)}`}>
                    <span className="text-base font-bold text-center text-white">{guess.character.race}</span>
                  </div>

                  <div className={`p-2 flex items-center justify-center rounded border ${getMatchColor(guess.matches.weapon)}`}>
                    <span className="text-base font-bold text-center text-white">{guess.character.weapon}</span>
                  </div>

                  <div className={`p-2 flex items-center justify-center rounded border ${getMatchColor(guess.matches.region)}`}>
                    <span className="text-base font-bold text-center text-white">{guess.character.region}</span>
                  </div>

                  <div className={`p-2 flex flex-col items-center justify-center rounded border ${
                    guess.matches.powerLevel === 'correct' ? 'bg-green-600 border-green-500' : 'bg-red-600 border-red-500'
                  }`}>
                    <span className="text-base font-bold text-white">{guess.character.powerLevel}</span>
                    {guess.matches.powerLevel === 'higher' && <ArrowUp size={18} className="text-yellow-300" />}
                    {guess.matches.powerLevel === 'lower' && <ArrowDown size={18} className="text-yellow-300" />}
                  </div>

                  <div className={`p-2 flex items-center justify-center rounded border ${getMatchColor(guess.matches.plane)}`}>
                    <span className="text-sm font-bold text-center break-words leading-tight text-white">
                      {guess.character.plane}
                    </span>
                  </div>

                </div>
              ))}
            </div>

            {guesses.length === 0 && !gameWon && targetCharacter && (
              <div className={`text-center py-12 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                <p className="text-lg">İlk tahmininizi yapın!</p>
              </div>
            )}

            {characterData.length === 0 && !loading && !loadError && (
              <div className="bg-yellow-600/20 border border-yellow-600 rounded-lg p-6 text-center">
                <p className="text-yellow-400 font-medium">
                  Sheet'te hiç karakter bulunamadı.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}