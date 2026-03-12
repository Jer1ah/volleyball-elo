/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Modal, Input, Radio, Button } from "antd";
import { SearchOutlined, PlusOutlined, DeleteOutlined, SettingOutlined, EditOutlined } from "@ant-design/icons";
import crownIcon from "./assets/crown.png";
import './app.css';

// ─── ELO LOGIC ────────────────────────────────────────────────────────────────
const INITIAL_ELO = 1000;
const K_FACTOR = 32;

const calculateNewRatings = (teamA: any[], teamB: any[], scoreA: number, scoreB: number) => {
  const avgA = teamA.reduce((s, p) => s + p.elo, 0) / teamA.length;
  const avgB = teamB.reduce((s, p) => s + p.elo, 0) / teamB.length;
  const expectedA = 1 / (1 + Math.pow(10, (avgB - avgA) / 400));
  const actualA = scoreA > scoreB ? 1 : 0;
  const mov = Math.log(Math.abs(scoreA - scoreB) + 1) * (2.2 / ((actualA === 1 ? avgA - avgB : avgB - avgA) * 0.001 + 2.2));
  return Math.round(K_FACTOR * mov * (actualA - expectedA));
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "vb_log_state";
const getRank = (elo: number) => {
  if (elo >= 1750) return { label: "Champion", color: "#FF3E3E" };
  if (elo >= 1400) return { label: "Diamond", color: "#00F5FF" };
  if (elo >= 1250) return { label: "Platinum", color: "#BF5AF2" };
  if (elo >= 1100) return { label: "Gold", color: "#FFD700" };
  if (elo >= 950) return { label: "Silver", color: "#A8B2C1" };
  return { label: "Bronze", color: "#CD7F32" };
};

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
const Pill = ({ label, color }: { label: string; color: string }) => (
  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 800, background: `${color}20`, color, border: `1px solid ${color}50` }}>{label}</span>
);

export default function EloTracker() {
  const [players, setPlayers] = useState<any>([]);
  const [matches, setMatches] = useState<any[]>([]); 
  const [tab, setTab] = useState("ranks"); 
  
  // Modals & Search
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");

  // Match State
  const [matchType, setMatchType] = useState(2); // 2 for Doubles, 3 for Triples
  const [teamA, setTeamA] = useState<any[]>([]);
  const [teamB, setTeamB] = useState<any[]>([]);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  
  // New Player State
  const [newName, setNewName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      setPlayers(data.players || []);
      setMatches(data.matches || []);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ players, matches }));
  }, [players, matches]);

  const addNewPlayer = () => {
    if (!newName.trim()) return;
    const player = { id: Date.now(), name: newName.trim(), elo: INITIAL_ELO, wins: 0, losses: 0 };
    setPlayers([...players, player]);
    setNewName("");
    setIsPlayerModalOpen(false);
  };

  const deletePlayer = (playerId: any) => {
    setPlayers(players.filter((p: any) => p.id !== playerId));
    setTeamA(teamA.filter((p: any) => p.id !== playerId));
    setTeamB(teamB.filter((p: any) => p.id !== playerId));
  };

  const updatePlayerName = (playerId: any, updatedName: string) => {
    setPlayers(players.map((p: any) => p.id === playerId ? { ...p, name: updatedName } : p));
  };

  const deleteMatch = (matchId: any) => {
    const matchToDelete = matches.find(m => m.id === matchId);

    setPlayers((prevPlayers: any) => prevPlayers.map((p: any) => {
      const isA = matchToDelete?.teamAIds?.includes(p.id);
      const isB = matchToDelete?.teamBIds?.includes(p.id);
      if (!isA && !isB) return p;
      const won = (isA && matchToDelete.winner === "Blue") || (isB && matchToDelete.winner === "Gold");
      const change = isA ? matchToDelete.eloShift : -matchToDelete.eloShift;
      return { ...p, elo: p.elo - change, wins: won ? Math.max(0, p.wins - 1) : p.wins, losses: won ? p.losses : Math.max(0, p.losses - 1) };
    }));
    setMatches(prevMatches => prevMatches.filter(m => m.id !== matchId));
  };

  const handleMatchSubmit = () => {
    if (teamA.length === 0 || teamB.length === 0 || scoreA === scoreB) return;
    const shift = calculateNewRatings(teamA, teamB, scoreA, scoreB);
    
    const matchEntry = {
      id: Date.now(),
      date: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      teamANames: teamA.map(p => p.name).join("/"),
      teamBNames: teamB.map(p => p.name).join("/"),
      teamAIds: teamA.map(p => p.id),
      teamBIds: teamB.map(p => p.id),
      score: `${scoreA}-${scoreB}`,
      winner: scoreA > scoreB ? "Blue" : "Gold",
      eloShift: shift,
      type: matchType === 2 ? "Doubles" : "Triples"
    };

    setPlayers((prev: any) => prev.map((p: any) => {
      const isA = teamA.find((t: any) => t.id === p.id);
      const isB = teamB.find((t: any) => t.id === p.id);
      if (!isA && !isB) return p;
      const won = (isA && scoreA > scoreB) || (isB && scoreB > scoreA);
      const change = isA ? shift : -shift;
      return { ...p, elo: p.elo + change, wins: won ? p.wins + 1 : p.wins, losses: won ? p.losses : p.losses + 1 };
    }));

    setMatches([matchEntry, ...matches]);
    setTeamA([]); setTeamB([]); setScoreA(0); setScoreB(0);
    setIsMatchModalOpen(false);
  };

  const togglePlayerSelection = (p: any) => {
    if (teamA.find((x: any) => x.id === p.id)) setTeamA(teamA.filter((x: any) => x.id !== p.id));
    else if (teamB.find((x: any) => x.id === p.id)) setTeamB(teamB.filter((x: any) => x.id !== p.id));
    else if (teamA.length < matchType) setTeamA([...teamA, p]);
    else if (teamB.length < matchType) setTeamB([...teamB, p]);
  };

  const filteredPlayers = players.filter((p: any) => 
    p.name.toLowerCase().includes(playerSearch.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", background: "#0D1117", color: "#E6EDF3", fontFamily: "sans-serif", position: "relative" }}>
      <style>{`
        .btn { padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s; }
        .tab-btn { flex: 1; padding: 14px; background: transparent; color: #8B949E; border: none; border-bottom: 2px solid #30363D; cursor: pointer; font-weight: bold; }
        .tab-active { color: #5C7CFA; border-bottom: 2px solid #5C7CFA; }
        .card { background: #161B22; border: 1px solid #30363D; border-radius: 12px; padding: 16px; margin: 10px; }
        .dark-modal .ant-modal-content { background: #161B22; color: white; border: 1px solid #30363D; }
        .dark-modal .ant-modal-header { background: #161B22; border-bottom: 1px solid #30363D; }
        .dark-modal .ant-modal-title { color: white; }
        .dark-input { background: #0D1117 !important; border: 1px solid #30363D !important; color: white !important; }
        .player-grid { display: flex; flex-wrap: wrap; gap: 8px; max-height: 124px; overflow-y: auto; padding: 10px; background: #0D1117; border-radius: 8px; }
        .settings-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #30363D; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={crownIcon} alt="Crown Logo" />
          <h2 style={{ margin: 0, letterSpacing: 1, marginTop: '2px' }}>
              <span style={{ color: "#5C7CFA", fontWeight: 500 }}>CLT</span><span style={{ color: "#339AF0", fontWeight: 400 }}>Volleyball</span>
          </h2>
        </div>
        <SettingOutlined 
          onClick={() => setIsSettingsModalOpen(true)} 
          style={{ fontSize: '22px', cursor: 'pointer', color: '#8B949E' }} 
        />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex" }}>
        <button className={`tab-btn ${tab === "ranks" ? "tab-active" : ""}`} onClick={() => setTab("ranks")}>RANKINGS</button>
        <button className={`tab-btn ${tab === "log" ? "tab-active" : ""}`} onClick={() => setTab("log")}>MATCH LOG</button>
      </div>

      {/* Content */}
      <div>
        {tab === "ranks" ? (
          <>
            <div style={{ padding: '10px' }}>
              <Button 
                type="primary" 
                block icon={<PlusOutlined />} 
                onClick={() => setIsPlayerModalOpen(true)} 
                style={{ height: '45px', borderRadius: '8px', background: '#5C7CFA', marginTop: '10px' }}
              >
                Add New Player
              </Button>
            </div>
            <div className="player-list-wrapper">
              {[...players].sort((a,b) => b.elo - a.elo).map((p, i) => (
                <div key={p.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: "bold", color: "#484F58", minWidth: '25px' }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold" }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "#8B949E" }}>{p.wins}-{p.losses}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: "bold", color: "lightgray" }}>{p.elo}</div>
                    <Pill label={getRank(p.elo).label} color={getRank(p.elo).color} />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: '10px' }}>
              <Button 
                type="primary" 
                block 
                icon={<PlusOutlined />} 
                onClick={() => setIsMatchModalOpen(true)} 
                style={{ height: '45px', borderRadius: '8px', background: '#5C7CFA', border: 'none', marginTop: '10px' }}
              >
                Add Match Entry
              </Button>
            </div>
            {matches.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#484F58" }}>No matches recorded.</div>
            ) : (
              <div className="matches-list">
              {matches.map(m => (
                <div key={m.id} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: "#8B949E" }}>{m.date} • {m.type}</span>
                      <button onClick={() => deleteMatch(m.id)} style={{ background: "none", border: "none", color: "#FF6B6B", cursor: "pointer", fontSize: 10 }}>Delete</button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ flex: 1, fontSize: 13, marginRight: 24 }}>
                          <div style={{ color: m.winner === "Blue" ? "#5C7CFA" : "white", fontWeight: m.winner === "Blue" ? "bold" : "400" }}>{m.teamANames}</div>
                          <p style={{ margin: '8px 0' }}>vs</p>
                          <div style={{ color: m.winner === "Gold" ? "#5C7CFA" : "white", fontWeight: m.winner === "Gold" ? "bold" : "400" }}>{m.teamBNames}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 20, fontWeight: "bold" }}>{m.score}</div>
                      </div>
                  </div>
                </div>
              ))}
              </div>
            )}
          </>
        )}
      </div>

      <Modal 
        title="Manage Players" 
        open={isSettingsModalOpen} 
        onCancel={() => setIsSettingsModalOpen(false)} 
        footer={null}
        className="dark-modal manage-players-modal"
      >
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {players.map((p: any) => (
            <div key={p.id} className="settings-row">
              <Input 
                value={p.name} 
                onChange={(e) => updatePlayerName(p.id, e.target.value)}
                className="dark-input"
                style={{ width: '70%', height: '32px' }}
                prefix={<EditOutlined style={{ color: '#484F58' }} />}
              />
              <Button 
                danger 
                type="text" 
                icon={<DeleteOutlined />}
                onClick={() => deletePlayer(p.id)} 
              />
            </div>
          ))}
          {players.length === 0 && <div style={{ color: '#484F58', textAlign: 'center', padding: '20px' }}>No players to manage.</div>}
        </div>
      </Modal>

      <Modal 
        title="Create New Player" 
        open={isPlayerModalOpen} 
        onCancel={() => { setIsPlayerModalOpen(false); setNewName(""); }}
        onOk={addNewPlayer} 
        className="dark-modal" 
        okText="Add Player"
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        <div style={{ padding: '10px 0' }}>
          <Input placeholder="Enter full name" value={newName} onChange={e => setNewName(e.target.value)} className="dark-input" />
        </div>
      </Modal>

      <Modal 
        title="Record Match" 
        open={isMatchModalOpen} 
        onCancel={() => { setIsMatchModalOpen(false); setTeamA([]); setTeamB([]); }} 
        onOk={handleMatchSubmit} className="dark-modal" 
        okText="Submit Match"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <Radio.Group 
            value={matchType} 
            onChange={e => { setMatchType(e.target.value); setTeamA([]); setTeamB([]); }} 
            style={{ marginBottom: 5 }}
            optionType="button"
            className="record-match-radio-group"
          >
            <Radio value={2}>Doubles</Radio>
            <Radio value={3}>Triples</Radio>
          </Radio.Group>

          <Input prefix={<SearchOutlined />} placeholder="Search players..." value={playerSearch} onChange={e => setPlayerSearch(e.target.value)} className="dark-input" />
          
          <div className="player-grid">
            {filteredPlayers.map((p: any) => {
              const isA = teamA.find(x => x.id === p.id);
              const isB = teamB.find(x => x.id === p.id);
              return (
                <button key={p.id} onClick={() => togglePlayerSelection(p)} className="btn" style={{ background: isA ? "#5C7CFA" : isB ? "#FFBE0B" : "#21262D", color: "white", fontSize: 11, padding: '5px 10px' }}>
                  {p.name}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: '#1c2128', padding: '10px', borderRadius: '8px', border: '1px solid #5C7CFA' }}>
              <div style={{ color: '#5C7CFA', fontWeight: 'bold', fontSize: 12 }}>BLUE TEAM</div>
              <div style={{ fontSize: 10, color: '#8B949E', minHeight: '20px' }}>{teamA.map(p => p.name).join(', ') || 'Select players'}</div>
              <Input type="number" value={scoreA} onChange={e => setScoreA(parseInt(e.target.value) || 0)} className="dark-input" style={{ marginTop: 8 }} />
            </div>
            <div style={{ background: '#1c2128', padding: '10px', borderRadius: '8px', border: '1px solid #FFBE0B' }}>
              <div style={{ color: '#FFBE0B', fontWeight: 'bold', fontSize: 12 }}>GOLD TEAM</div>
              <div style={{ fontSize: 10, color: '#8B949E', minHeight: '20px' }}>{teamB.map(p => p.name).join(', ') || 'Select players'}</div>
              <Input type="number" value={scoreB} onChange={e => setScoreB(parseInt(e.target.value) || 0)} className="dark-input" style={{ marginTop: 8 }} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}