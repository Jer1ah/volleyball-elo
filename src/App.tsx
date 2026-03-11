/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import settingsIcon from "./assets/settings.png";
import crownIcon from "./assets/crown.png";
import './app.css';

// ─── ELO LOGIC ────────────────────────────────────────────────────────────────
const INITIAL_ELO = 1000;
const K_FACTOR = 32;

const calculateNewRatings = (teamA: any, teamB: any, scoreA: any, scoreB: any) => {
  const avgA = teamA.reduce((s: any, p: any) => s + p.elo, 0) / teamA.length;
  const avgB = teamB.reduce((s: any, p: any) => s + p.elo, 0) / teamB.length;
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

const GTag = ({ gender }: { gender: string }) => (
  <span style={{ width: 18, height: 18, borderRadius: "50%", fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", background: gender === "F" ? "rgba(255,105,180,0.2)" : "rgba(100,160,255,0.2)", color: gender === "F" ? "#FF69B4" : "#5BA4F5", border: `1px solid ${gender === "F" ? "#FF69B480" : "#5BA4F5"}` }}>{gender}</span>
);

export default function EloTracker() {
  const [players, setPlayers] = useState<any>([]);
  const [matches, setMatches] = useState<any[]>([]); 
  const [view, setView] = useState("home"); 
  const [tab, setTab] = useState("ranks"); 
  const [showMenu, setShowMenu] = useState(false);
  
  const [teamA, setTeamA] = useState<any[]>([]);
  const [teamB, setTeamB] = useState<any[]>([]);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [newName, setNewName] = useState("");
  const [newGender, setNewGender] = useState("M");

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
    const player = { id: Date.now(), name: newName.trim(), gender: newGender, elo: INITIAL_ELO, wins: 0, losses: 0 };
    setPlayers([...players, player]);
    setNewName("");
    setView("home");
  };

  const deleteMatch = (matchId: any) => {
    const matchToDelete = matches.find(m => m.id === matchId);

    setPlayers((prevPlayers: any) => prevPlayers.map((p: any) => {
      // Optional chaining (?.) ensures we don't crash if arrays are missing
      const isA = matchToDelete?.teamAIds?.includes(p.id);
      const isB = matchToDelete?.teamBIds?.includes(p.id);
      
      if (!isA && !isB) return p;

      const won = (isA && matchToDelete.winner === "Blue") || (isB && matchToDelete.winner === "Gold");
      const change = isA ? matchToDelete.eloShift : -matchToDelete.eloShift;

      return {
        ...p,
        elo: p.elo - change,
        wins: won ? Math.max(0, p.wins - 1) : p.wins,
        losses: won ? p.losses : Math.max(0, p.losses - 1)
      };
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
      eloShift: shift
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
    setView("home");
    setTab("log");
  };

  const togglePlayerSelection = (p: any) => {
    if (teamA.find((x: any) => x.id === p.id)) setTeamA(teamA.filter((x: any) => x.id !== p.id));
    else if (teamB.find((x: any) => x.id === p.id)) setTeamB(teamB.filter((x: any) => x.id !== p.id));
    else if (teamA.length < 2) setTeamA([...teamA, p]);
    else setTeamB([...teamB, p]);
  };

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", background: "#0D1117", color: "#E6EDF3", minHeight: "100vh", fontFamily: "sans-serif", position: "relative" }}>
      <style>{`
        .btn { padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s; }
        .tab-btn { flex: 1; padding: 14px; background: transparent; color: #8B949E; border: none; border-bottom: 2px solid #30363D; cursor: pointer; font-weight: bold; }
        .tab-active { color: #5C7CFA; border-bottom: 2px solid #5C7CFA; }
        .card { background: #161B22; border: 1px solid #30363D; border-radius: 12px; padding: 16px; margin: 10px; }
        input { background: #0D1117; border: 1px solid #30363D; color: white; padding: 12px; border-radius: 8px; width: 100%; box-sizing: border-box; }
        .menu-item { padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #30363D; }
        .menu-item:hover { background: #21262D; }
      `}</style>

      <div style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={crownIcon} alt="Crown Logo" />
          <h2 style={{ margin: 0, letterSpacing: 1, cursor: 'pointer', marginTop: '2px' }} onClick={() => setView("home")}>
              <span style={{ color: "#5C7CFA" }}>CLT</span><span style={{ color: "#339AF0" }}>Volleyball</span>
          </h2>
        </div>
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowMenu(!showMenu)} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <img src={settingsIcon} alt="Settings Icon" style={{ height: '30px' }} />
          </button>
          {showMenu && (
            <div style={{ position: "absolute", right: 0, top: 35, background: "#161B22", border: "1px solid #30363D", borderRadius: 8, width: 180, zIndex: 100, fontSize: 12 }}>
              <div className="menu-item" onClick={() => { setView("addMatch"); setShowMenu(false); }}>Add Match Entry</div>
              <div className="menu-item" onClick={() => { setView("addPlayer"); setShowMenu(false); }}>Manage Players</div>
              <div className="menu-item" style={{ color: "#FF6B6B" }} onClick={() => setShowMenu(false)}>Cancel</div>
            </div>
          )}
        </div>
      </div>

      {view === "home" && (
        <>
          <div style={{ display: "flex" }}>
            <button className={`tab-btn ${tab === "ranks" ? "tab-active" : ""}`} onClick={() => setTab("ranks")}>RANKINGS</button>
            <button className={`tab-btn ${tab === "log" ? "tab-active" : ""}`} onClick={() => setTab("log")}>MATCH LOG</button>
          </div>
          <div className="player-list-wrapper">
            {tab === "ranks" ? (
              [...players].sort((a,b) => b.elo - a.elo).map((p, i) => (
                <div key={p.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: "bold", color: "#484F58", width: 25 }}>{i + 1}</div>
                  <GTag gender={p.gender} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold" }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "#8B949E" }}>{p.wins}-{p.losses}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: "bold", color: "lightgray", marginRight: '2px' }}>{p.elo}</div>
                    <Pill label={getRank(p.elo).label} color={getRank(p.elo).color} />
                  </div>
                </div>
              ))
            ) : (
              matches.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#484F58" }}>No matches recorded.</div>
              ) : (
                matches.map(m => (
                  <div key={m.id} className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: "#8B949E" }}>{m.date}</span>
                        <button onClick={() => deleteMatch(m.id)} style={{ background: "none", border: "none", color: "#FF6B6B", cursor: "pointer", fontSize: 10, padding: '0' }}>Delete Match</button>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ flex: 1, fontSize: 13 }}>
                            <div style={{ color: m.winner === "Blue" ? "#5C7CFA" : "white", fontWeight: m.winner === "Blue" ? "bold" : "300" }}>{m.teamANames}</div>
                            <div style={{ color: m.winner === "Gold" ? "#5C7CFA" : "white", fontWeight: m.winner === "Gold" ? "bold" : "300", marginTop: 4 }}>{m.teamBNames}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 20, fontWeight: "bold" }}>{m.score}</div>
                        </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </>
      )}

      {view === "addMatch" && (
        <div style={{ padding: 10 }}>
          <button className="btn" style={{ background: "transparent", color: "#8B949E" }} onClick={() => setView("home")}>← Back</button>
          <div className="card">
            <h3 style={{ margin: '0 0 16px' }}>Select Players</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} className="select-player-list">
              {players.map((p: any) => {
                const isA = teamA.find(x => x.id === p.id);
                const isB = teamB.find(x => x.id === p.id);
                return (
                  <button key={p.id} onClick={() => togglePlayerSelection(p)} className="btn" style={{ background: isA ? "#5C7CFA" : isB ? "#FFBE0B" : "#21262D", color: isA || isB ? "white" : "#8B949E", fontSize: 12 }}>{p.name}</button>
                );
              })}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="card" style={{ borderColor: "#5C7CFA" }}>
              <div style={{ color: "#5C7CFA", fontWeight: "bold" }}>BLUE</div>
              <input value={scoreA} onChange={e => setScoreA(parseInt(e.target.value) || 0)} style={{ marginTop: 10 }} />
            </div>
            <div className="card" style={{ borderColor: "#FFBE0B" }}>
              <div style={{ color: "#FFBE0B", fontWeight: "bold" }}>GOLD</div>
              <input value={scoreB} onChange={e => setScoreB(parseInt(e.target.value) || 0)} style={{ marginTop: 10 }} />
            </div>
          </div>
          <button onClick={handleMatchSubmit} className="btn" style={{ width: "calc(100% - 20px)", margin: "10px", background: "#3FB950", color: "white" }}>RECORD MATCH</button>
        </div>
      )}

      {view === "addPlayer" && (
        <div style={{ padding: 10 }}>
          <button className="btn" style={{ background: "transparent", color: "#8B949E" }} onClick={() => setView("home")}>← Back</button>
          <div className="card">
            <h3>Create Player</h3>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" style={{ marginBottom: 15 }} />
            <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
              <button onClick={() => setNewGender("M")} className="btn" style={{ flex: 1, background: newGender === "M" ? "#5C7CFA" : "#21262D", color: "white" }}>M</button>
              <button onClick={() => setNewGender("F")} className="btn" style={{ flex: 1, background: newGender === "F" ? "#FF69B4" : "#21262D", color: "white" }}>F</button>
            </div>
            <button onClick={addNewPlayer} className="btn" style={{ width: "100%", background: "#5C7CFA", color: "white" }}>ADD TO ROSTER</button>
          </div>
          <div className="overall-player-list">
             {players.map((p: any) => (
               <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #21262D" }}>
                 <span>{p.name} <span style={{ color: "#484F58", fontSize: 12 }}>({p.gender})</span></span>
                 <button onClick={() => setPlayers(players.filter((x: any) => x.id !== p.id))} style={{ background: "none", border: "none", color: "#FF6B6B", cursor: "pointer" }}>Delete</button>
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
}