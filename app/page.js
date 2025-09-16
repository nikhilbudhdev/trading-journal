'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/* ---------- Shared UI ---------- */
const MenuButton = ({ onClick, children, className = '' }) => (
  <button
    onClick={onClick}
    className={`w-full max-w-md p-6 text-xl font-semibold rounded-lg border-2 transition-all hover:scale-105 ${className}`}
  >
    {children}
  </button>
)

const InputField = ({ label, type = 'text', value, onChange, placeholder, required = false, step }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium mb-2 text-slate-300">
      {label} {required && <span className="text-emerald-400">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      step={step}
      autoComplete="off"
      className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400"
    />
  </div>
)

const SelectField = ({ label, value, onChange, options, required = false }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium mb-2 text-slate-300">
      {label} {required && <span className="text-emerald-400">*</span>}
    </label>
    <select
      value={value}
      onChange={onChange}
      className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
    >
      {options.map(option => (
        <option key={option.value} value={option.value} className="bg-slate-800 text-slate-100">
          {option.label}
        </option>
      ))}
    </select>
  </div>
)

/* ---------- Balance Manager (for executed trades only) ---------- */
const BalanceManager = () => {
  const [currentBalance, setCurrentBalance] = useState(0)
  const [balanceHistory, setBalanceHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddBalance, setShowAddBalance] = useState(false)
  const [newBalance, setNewBalance] = useState({ amount: '', reason: '' })

  useEffect(() => { loadBalanceData() }, [])

  const loadBalanceData = async () => {
    setLoading(true)
    try {
      const { data: history, error: historyError } = await supabase
        .from('balance_history')
        .select('*')
        .order('created_at', { ascending: false })

      if (historyError) throw historyError
      setBalanceHistory(history || [])
      const latestEntry = history?.[0]
      setCurrentBalance(latestEntry?.balance || 0)
    } catch (err) {
      console.error('Error loading balance:', err.message)
    }
    setLoading(false)
  }

  const handleAddBalance = async (e) => {
    e.preventDefault()
    if (!newBalance.amount) return
    try {
      const changeAmount = parseFloat(newBalance.amount)
      const newBalanceAmount = parseFloat(currentBalance) + changeAmount
      const { error } = await supabase
        .from('balance_history')
        .insert([{
          balance: newBalanceAmount,
          change_amount: changeAmount,
          change_reason: newBalance.reason || (changeAmount > 0 ? 'Deposit' : 'Withdrawal')
        }])
      if (error) throw error
      await loadBalanceData()
      setShowAddBalance(false)
      setNewBalance({ amount: '', reason: '' })
    } catch (err) {
      console.error('Error updating balance:', err.message)
    }
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-slate-100">Account Balance</h2>
        <button
          onClick={() => setShowAddBalance(!showAddBalance)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
        >
          {showAddBalance ? 'Cancel' : 'Add Deposit/Withdrawal'}
        </button>
      </div>

      <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg mb-6">
        <div className="text-center">
          <h3 className="text-lg text-slate-400">Current Balance</h3>
          <p className="text-4xl font-bold text-emerald-400">${currentBalance.toFixed(2)}</p>
        </div>
      </div>

      {showAddBalance && (
        <form onSubmit={handleAddBalance} className="bg-slate-800 border border-slate-700 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-4 text-slate-100">Add Deposit or Withdrawal</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Amount (use negative for withdrawals)"
              type="number"
              step="0.01"
              value={newBalance.amount}
              onChange={(e) => setNewBalance(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="e.g., 500.00 or -200.00"
              required
            />
            <InputField
              label="Reason"
              value={newBalance.reason}
              onChange={(e) => setNewBalance(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g., Monthly deposit, Profit withdrawal"
            />
          </div>
          <div className="flex gap-4 mt-4">
            <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
              Add Transaction
            </button>
            <button type="button" onClick={() => setShowAddBalance(false)} className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <h3 className="p-4 font-semibold border-b border-slate-700 text-slate-100">Recent Balance Changes</h3>
        <div className="max-h-60 overflow-y-auto">
          {balanceHistory.slice(0, 10).map((entry, index) => (
            <div key={entry.id || index} className="p-4 border-b border-slate-700 last:border-b-0">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-slate-100">{entry.change_reason}</p>
                  <p className="text-sm text-slate-400">
                    {new Date(entry.created_at).toLocaleDateString()} at {new Date(entry.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${entry.change_amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {entry.change_amount >= 0 ? '+' : ''}${entry.change_amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-400">Balance: ${entry.balance.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------- Update Existing Trade (executed, updates balance) ---------- */
const UpdateTradeView = ({ setCurrentView, setMessage, message, isSubmitting, setIsSubmitting }) => {
  const [openTrades, setOpenTrades] = useState([])
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updateData, setUpdateData] = useState({ exit_url: '', pnl: '', notes: '' })

  useEffect(() => {
    const loadOpenTrades = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('status', 'open')
          .order('entry_date', { ascending: false })
        if (error) throw error
        setOpenTrades(data || [])
      } catch (err) {
        setMessage(`Error: ${err.message}`)
      }
      setLoading(false)
    }
    loadOpenTrades()
  }, [setMessage])

  const handleUpdateTrade = async (e) => {
    e.preventDefault()
    if (!selectedTrade) return
    setIsSubmitting(true)
    setMessage('')

    try {
      const pnlAmount = updateData.pnl ? parseFloat(updateData.pnl) : 0

      // 1) Close trade
      const { error } = await supabase
        .from('trades')
        .update({
          exit_date: new Date().toISOString(),
          exit_url: updateData.exit_url || null,
          pnl: pnlAmount,
          notes: updateData.notes || selectedTrade.notes,
          status: 'closed'
        })
        .eq('id', selectedTrade.id)
      if (error) throw error

      // 2) Update account balance (executed trades only)
      if (pnlAmount !== 0) {
        const { data: balanceHistory, error: balanceError } = await supabase
          .from('balance_history')
          .select('balance')
          .order('created_at', { ascending: false })
          .limit(1)

        if (balanceError) throw balanceError

        const currentBalance = balanceHistory?.[0]?.balance || 0
        const newBalance = currentBalance + pnlAmount

        const { error: balanceInsertError } = await supabase
          .from('balance_history')
          .insert([{
            balance: newBalance,
            change_amount: pnlAmount,
            change_reason: `Trade P&L: ${selectedTrade.pair} ${selectedTrade.direction}`,
            trade_id: selectedTrade.id
          }])

        if (balanceInsertError) throw balanceInsertError
      }

      setMessage('Trade updated successfully! Balance automatically adjusted.')
      setSelectedTrade(null)
      setUpdateData({ exit_url: '', pnl: '', notes: '' })
      
      const { data: updatedTrades } = await supabase
        .from('trades')
        .select('*')
        .eq('status', 'open')
        .order('entry_date', { ascending: false })
      setOpenTrades(updatedTrades || [])

    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }

    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
      <button 
        onClick={() => setCurrentView('menu')}
        className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors"
      >
        ← Back to Menu
      </button>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Update Existing Trade</h1>
        {message && (
          <div className={`p-4 rounded-lg mb-6 border ${message.includes('Error') ? 'bg-red-900/20 text-red-300 border-red-800' : 'bg-emerald-900/20 text-emerald-300 border-emerald-800'}`}>
            {message}
          </div>
        )}
        {loading ? <p className="text-slate-400">Loading open trades...</p> :
          openTrades.length === 0 ? <p className="text-slate-400">No open trades found.</p> :
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Open Trades ({openTrades.length})</h2>
            <div className="grid gap-4">
              {openTrades.map(trade => (
                <div
                  key={trade.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedTrade?.id === trade.id ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-700 hover:border-slate-600 bg-slate-800'}`}
                  onClick={() => setSelectedTrade(trade)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{trade.pair} - {trade.direction.toUpperCase()}</h3>
                      <p className="text-slate-400 text-sm">Entry: {new Date(trade.entry_date).toLocaleDateString()}</p>
                      <p className="text-slate-500 text-sm">Type: {trade.entrytype} | Rule3: {trade.rule3} | Zone: {trade.zone}</p>
                      {trade.pattern_traded && <p className="text-slate-500 text-sm">Pattern: {trade.pattern_traded}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Stop Size: {trade.stopsize}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedTrade && (
              <div className="mt-8 p-6 bg-slate-800 border border-slate-700 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Close Trade: {selectedTrade.pair} - {selectedTrade.direction.toUpperCase()}</h3>
                <form onSubmit={handleUpdateTrade} className="space-y-4">
                  <InputField label="Exit Chart/Analysis URL (Optional)" type="url" value={updateData.exit_url} onChange={(e) => setUpdateData(prev => ({ ...prev, exit_url: e.target.value }))} placeholder="https://tradingview.com/chart/..." />
                  <InputField label="P&L ($)" type="number" step="0.01" value={updateData.pnl} onChange={(e) => setUpdateData(prev => ({ ...prev, pnl: e.target.value }))} placeholder="e.g., 150.00 or -75.50" required />
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-slate-300">Additional Notes (Optional)</label>
                    <textarea value={updateData.notes} onChange={(e) => setUpdateData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Exit reasons, lessons learned..." rows="3" className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400" />
                  </div>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setSelectedTrade(null)} className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors">Close Trade</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        }
      </div>
    </div>
  )
}

/* ---------- Trading Analytics (executed) ---------- */
const TradingAnalytics = ({ trades }) => {
  const closedTrades = trades.filter(trade => trade.status === 'closed' && trade.pnl !== null)
  if (closedTrades.length < 5) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4 text-slate-100">Trading Analytics</h2>
        <p className="text-slate-400">Need at least 5 completed trades for meaningful analysis. Current: {closedTrades.length}</p>
      </div>
    )
  }

  const calculateStats = (trades, field) => {
    const stats = {}
    trades.forEach(trade => {
      const key = trade[field]
      if (key) {
        if (!stats[key]) stats[key] = { wins: 0, losses: 0, totalPnL: 0, count: 0 }
        stats[key].count++
        stats[key].totalPnL += parseFloat(trade.pnl)
        if (parseFloat(trade.pnl) > 0) stats[key].wins++
        else stats[key].losses++
      }
    })
    return stats
  }

  const patternStats = calculateStats(closedTrades, 'pattern_traded')
  const zoneStats = calculateStats(closedTrades, 'zone')
  const entryTypeStats = calculateStats(closedTrades, 'entrytype')
  const rule3Stats = calculateStats(closedTrades, 'rule3')
  const pairStats = calculateStats(closedTrades, 'pair')

  const dayStats = {}
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  closedTrades.forEach(trade => {
    const day = dayNames[new Date(trade.entry_date).getDay()]
    if (!dayStats[day]) dayStats[day] = { wins:0, losses:0, totalPnL:0, count:0 }
    dayStats[day].count++
    dayStats[day].totalPnL += parseFloat(trade.pnl)
    if (parseFloat(trade.pnl) > 0) dayStats[day].wins++
    else dayStats[day].losses++
  })

  const winningTrades = closedTrades.filter(t => parseFloat(t.pnl) > 0)
  const losingTrades = closedTrades.filter(t => parseFloat(t.pnl) < 0)
  const avgWin = winningTrades.length ? winningTrades.reduce((s,t)=>s+parseFloat(t.pnl),0)/winningTrades.length : 0
  const avgLoss = losingTrades.length ? Math.abs(losingTrades.reduce((s,t)=>s+parseFloat(t.pnl),0)/losingTrades.length) : 0
  const riskRewardRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 'N/A'

  const StatCard = ({ title, stats }) => (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3 text-slate-100">{title}</h3>
      <div className="space-y-2">
        {Object.entries(stats)
          .filter(([_, data]) => data.count >= 2)
          .sort((a, b) => (b[1].totalPnL - a[1].totalPnL))
          .slice(0, 5)
          .map(([key, data]) => {
            const winRate = ((data.wins / data.count) * 100).toFixed(1)
            const avgPnL = (data.totalPnL / data.count).toFixed(2)
            return (
              <div key={key} className="flex justify-between items-center">
                <div>
                  <span className="text-slate-200 font-medium">{key}</span>
                  <span className="text-slate-400 text-sm ml-2">({data.count} trades)</span>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${data.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${data.totalPnL.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {winRate}% • Avg: ${avgPnL}
                  </div>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-6 text-slate-100">Trading Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-slate-100">Risk-Reward Profile</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-slate-400">Average Win:</span><span className="text-emerald-400 font-semibold">${avgWin.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Average Loss:</span><span className="text-red-400 font-semibold">${avgLoss.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Risk-Reward Ratio:</span><span className="text-slate-100 font-semibold">{riskRewardRatio}</span></div>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-slate-100">Trading Volume</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-slate-400">Total Trades:</span><span className="text-slate-100 font-semibold">{closedTrades.length}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Winning Trades:</span><span className="text-emerald-400 font-semibold">{winningTrades.length}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Losing Trades:</span><span className="text-red-400 font-semibold">{losingTrades.length}</span></div>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-slate-100">Performance Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Total P&L:</span>
              <span className={`font-semibold ${closedTrades.reduce((sum, t) => sum + parseFloat(t.pnl), 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${closedTrades.reduce((sum, t) => sum + parseFloat(t.pnl), 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Win Rate:</span>
              <span className="text-slate-100 font-semibold">{((winningTrades.length / closedTrades.length) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatCard title="Top Performing Patterns" stats={patternStats} />
        <StatCard title="Zone Performance" stats={zoneStats} />
        <StatCard title="Entry Type Performance" stats={entryTypeStats} />
        <StatCard title="Rule3 Performance" stats={rule3Stats} />
        <StatCard title="Day of Week Performance" stats={dayStats} />
        <StatCard title="Currency Pair Performance" stats={pairStats} />
      </div>
    </div>
  )
}

/* ---------- View Historical Data (includes BalanceManager) ---------- */
const ViewHistoricalData = ({ setCurrentView }) => {
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const loadTrades = async () => {
      setLoading(true)
      try {
        let query = supabase.from('trades').select('*')
        if (filter !== 'all') query = query.eq('status', filter)
        const { data, error } = await query.order('entry_date', { ascending: false })
        if (error) throw error
        setTrades(data || [])
      } catch (err) {
        console.error('Error:', err.message)
      }
      setLoading(false)
    }
    loadTrades()
  }, [filter])

  const totalPnL = trades.filter(t => t.pnl !== null).reduce((s,t)=> s + parseFloat(t.pnl), 0)
  const winningTrades = trades.filter(t => t.pnl > 0).length
  const losingTrades = trades.filter(t => t.pnl < 0).length
  const winRate = trades.length > 0 ? ((winningTrades / (winningTrades + losingTrades)) * 100).toFixed(1) : 0

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors">← Back to Menu</button>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">View Historical Data</h1>

        {/* Balance Manager for executed trades only */}
        <BalanceManager />

        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === 'overview' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'}`}>Overview</button>
          <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === 'analytics' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'}`}>Analytics</button>
          <button onClick={() => setActiveTab('trades')} className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === 'trades' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'}`}>Trade History</button>
        </div>

        {activeTab === 'overview' && (
          <>
            <h2 className="text-2xl font-bold mb-4">Trading Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Total Trades</h3><p className="text-2xl font-bold text-slate-100">{trades.length}</p></div>
              <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Trading P&L</h3><p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>${totalPnL.toFixed(2)}</p></div>
              <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Win Rate</h3><p className="text-2xl font-bold text-slate-100">{winRate}%</p></div>
              <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg"><h3 className="text-sm text-slate-400">W/L Ratio</h3><p className="text-2xl font-bold text-slate-100">{winningTrades}/{losingTrades}</p></div>
            </div>
          </>
        )}

        {activeTab === 'analytics' && <TradingAnalytics trades={trades} />}

        {activeTab === 'trades' && (
          <>
            {loading ? (
              <p className="text-slate-400">Loading trade history...</p>
            ) : trades.length === 0 ? (
              <p className="text-slate-400">No trades found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="p-3 text-left text-slate-300">Entry Date</th>
                      <th className="p-3 text-left text-slate-300">Pair</th>
                      <th className="p-3 text-left text-slate-300">Direction</th>
                      <th className="p-3 text-left text-slate-300">Entry Type</th>
                      <th className="p-3 text-left text-slate-300">Rule3</th>
                      <th className="p-3 text-left text-slate-300">Zone</th>
                      <th className="p-3 text-left text-slate-300">Pattern</th>
                      <th className="p-3 text-left text-slate-300">Entry URL</th>
                      <th className="p-3 text-left text-slate-300">Exit URL</th>
                      <th className="p-3 text-left text-slate-300">P&L ($)</th>
                      <th className="p-3 text-left text-slate-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t, idx) => (
                      <tr key={t.id || idx} className={idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-900'}>
                        <td className="p-3 text-sm text-slate-300">{t.entry_date ? new Date(t.entry_date).toLocaleDateString() : '-'}</td>
                        <td className="p-3 font-semibold text-slate-100">{t.pair}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${t.direction === 'long' ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800' : 'bg-red-900/40 text-red-300 border border-red-800'}`}>
                            {t.direction?.toUpperCase() || '-'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">{t.entrytype || '-'}</td>
                        <td className="p-3 text-slate-300">{t.rule3 || '-'}</td>
                        <td className="p-3 text-slate-300">{t.zone || '-'}</td>
                        <td className="p-3 text-slate-300">{t.pattern_traded || '-'}</td>
                        <td className="p-3">{t.entry_url ? <a href={t.entry_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 text-xs underline">Entry</a> : <span className="text-slate-500 text-xs">-</span>}</td>
                        <td className="p-3">{t.exit_url ? <a href={t.exit_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs underline">Exit</a> : <span className="text-slate-500 text-xs">-</span>}</td>
                        <td className="p-3">{t.pnl !== null && t.pnl !== undefined ? (
                          <span className={`${parseFloat(t.pnl) >= 0 ? 'text-emerald-400' : 'text-red-400'} font-semibold`}>{parseFloat(t.pnl).toFixed(2)}</span>
                        ) : <span className="text-slate-500">-</span>}</td>
                        <td className="p-3 text-slate-300 capitalize">{t.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ---------- Missed Trades Analytics (percent) ---------- */
const MissedTradesAnalytics = ({ missed }) => {
  if (!missed || missed.length < 3) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4 text-slate-100">Missed Trades Analytics</h2>
        <p className="text-slate-400">Need at least 3 missed trades for meaningful analysis. Current: {missed.length || 0}</p>
      </div>
    )
  }
  const toNumber = (v) => (v === null || v === undefined || v === '') ? 0 : parseFloat(v)
  const sumPct = missed.reduce((s,r)=> s + toNumber(r.potential_return), 0)
  const avgPct = sumPct / missed.length

  const calcStats = (rows, field) => {
    const stats = {}
    rows.forEach(row => {
      const key = row[field] || '—'
      if (!stats[key]) stats[key] = { count: 0, totalPct: 0 }
      stats[key].count++
      stats[key].totalPct += toNumber(row.potential_return)
    })
    return stats
  }
  const byDay = {}
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  missed.forEach(row => {
    const d = row.created_at ? new Date(row.created_at) : new Date()
    const key = dayNames[d.getDay()]
    if (!byDay[key]) byDay[key] = { count:0, totalPct:0 }
    byDay[key].count++
    byDay[key].totalPct += toNumber(row.potential_return)
  })
  const byPair = calcStats(missed, 'pair')
  const byPattern = calcStats(missed, 'pattern')

  const StatCard = ({ title, stats, suffix='misses' }) => (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3 text-slate-100">{title}</h3>
      <div className="space-y-2">
        {Object.entries(stats)
          .sort((a,b)=> b[1].totalPct - a[1].totalPct)
          .slice(0,5)
          .map(([key, data]) => (
            <div key={key} className="flex justify-between items-center">
              <div>
                <span className="text-slate-200 font-medium">{key}</span>
                <span className="text-slate-400 text-sm ml-2">({data.count} {suffix})</span>
              </div>
              <div className={`text-sm font-semibold ${data.totalPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {data.totalPct.toFixed(2)}%
              </div>
            </div>
          ))}
      </div>
    </div>
  )

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-6 text-slate-100">Missed Trades Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-slate-100">Overview</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-slate-400">Missed Trades:</span><span className="text-slate-100 font-semibold">{missed.length}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Total Potential (Σ%):</span><span className={`font-semibold ${sumPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{sumPct.toFixed(2)}%</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Avg Potential / Miss:</span><span className="text-slate-100 font-semibold">{avgPct.toFixed(2)}%</span></div>
          </div>
        </div>
        <StatCard title="By Day of Week" stats={byDay} />
        <StatCard title="By Pair" stats={byPair} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatCard title="Top Patterns Missed" stats={byPattern} />
      </div>
    </div>
  )
}

/* ---------- Missed Trade entry (percent returns) ---------- */
const MissedTradeView = ({ setCurrentView }) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    pair: '',
    direction: 'long',
    before_url: '',
    pattern: '',
    after_url: '',
    potential_return: '' // percent value e.g. 2.5 for +2.5%
  })
  const handleInput = (field, value) => setForm(prev => ({ ...prev, [field]: value }))
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    try {
      const payload = {
        pair: form.pair.toUpperCase(),
        direction: form.direction,
        before_url: form.before_url || null,
        pattern: form.pattern || null,
        after_url: form.after_url || null,
        potential_return: form.potential_return === '' ? null : parseFloat(form.potential_return)
      }
      const { error } = await supabase.from('missed_trades').insert([payload])
      if (error) throw error
      setMessage('Missed trade logged!')
      setForm({ pair:'', direction:'long', before_url:'', pattern:'', after_url:'', potential_return:'' })
    } catch (err) { setMessage(`Error: ${err.message}`) }
    setIsSubmitting(false)
  }
  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors">← Back to Menu</button>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Log Missed Trade</h1>
        {message && <div className={`p-4 rounded-lg mb-6 border ${message.startsWith('Error') ? 'bg-red-900/20 text-red-300 border-red-800' : 'bg-emerald-900/20 text-emerald-300 border-emerald-800'}`}>{message}</div>}
        <form onSubmit={handleSubmit} className="space-y-6 bg-slate-800 border border-slate-700 p-6 rounded-lg">
          <InputField label="Currency Pair" value={form.pair} onChange={(e)=>handleInput('pair', e.target.value)} placeholder="e.g., EURUSD, GBPJPY" required />
          <SelectField label="Direction" value={form.direction} onChange={(e)=>handleInput('direction', e.target.value)} options={[{value:'long',label:'Long (Buy)'},{value:'short',label:'Short (Sell)'}]} required />
          <InputField label="Before Trade TradingView Link (Optional)" type="url" value={form.before_url} onChange={(e)=>handleInput('before_url', e.target.value)} placeholder="https://tradingview.com/chart/..." />
          <SelectField label="Pattern Spotted" value={form.pattern} onChange={(e)=>handleInput('pattern', e.target.value)} options={[
            { value: '', label: 'Select a pattern...' },
            { value: 'Bull Flag', label: 'Bull Flag' },
            { value: 'Bear Flag', label: 'Bear Flag' },
            { value: 'Flat Flag', label: 'Flat Flag' },
            { value: 'Symmetrical Triangle', label: 'Symmetrical Triangle' },
            { value: 'Expanding Triangle', label: 'Expanding Triangle' },
            { value: 'Falcon Flag', label: 'Falcon Flag' },
            { value: 'Ascending Channel', label: 'Ascending Channel' },
            { value: 'Descending Channel', label: 'Descending Channel' },
            { value: 'Rising Wedge', label: 'Rising Wedge' },
            { value: 'Falling Wedge', label: 'Falling Wedge' },
            { value: 'H&S', label: 'H&S' },
            { value: 'Double Top', label: 'Double Top' },
            { value: 'Double Bottom', label: 'Double Bottom' },
            { value: 'The Arc', label: 'The Arc' },
            { value: 'Structural Test', label: 'Structural Test' },
            { value: 'Hook Point', label: 'Hook Point' },
            { value: 'Reverse M Style', label: 'Reverse M Style' },
            { value: 'M Style', label: 'M Style' }
          ]} />
          <InputField label="After Trade TradingView Link (Optional)" type="url" value={form.after_url} onChange={(e)=>handleInput('after_url', e.target.value)} placeholder="https://tradingview.com/chart/..." />
          <InputField label="Potential Return (%) (Optional)" type="number" step="0.01" value={form.potential_return} onChange={(e)=>handleInput('potential_return', e.target.value)} placeholder="e.g., 2.50 or -1.25" />
          <button type="submit" disabled={isSubmitting} className="w-full p-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white rounded-lg font-semibold transition-colors">{isSubmitting ? 'Saving...' : 'Save Missed Trade'}</button>
        </form>
      </div>
    </div>
  )
}

/* ---------- Missed Trades History ---------- */
const ViewMissedTrades = ({ setCurrentView }) => {
  const [missed, setMissed] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.from('missed_trades').select('*').order('created_at', { ascending: false })
        if (error) throw error
        setMissed(data || [])
      } catch (err) {
        console.error('Error loading missed trades:', err.message)
      }
      setLoading(false)
    }
    load()
  }, [])

  const toNumber = (v) => (v === null || v === undefined || v === '') ? 0 : parseFloat(v)
  const totalPct = missed.reduce((s,r)=> s + toNumber(r.potential_return), 0)
  const avgPct = missed.length ? (totalPct / missed.length) : 0

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors">← Back to Menu</button>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Missed Trades History</h1>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === 'overview' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'}`}>Overview</button>
          <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === 'analytics' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'}`}>Analytics</button>
          <button onClick={() => setActiveTab('trades')} className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === 'trades' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'}`}>Missed Trades Table</button>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Missed Trades</h3><p className="text-2xl font-bold text-slate-100">{missed.length}</p></div>
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Total Potential (Σ%)</h3><p className={`text-2xl font-bold ${totalPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{totalPct.toFixed(2)}%</p></div>
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Avg Potential / Miss</h3><p className="text-2xl font-bold text-slate-100">{avgPct.toFixed(2)}%</p></div>
          </div>
        )}

        {activeTab === 'analytics' && <MissedTradesAnalytics missed={missed} />}

        {activeTab === 'trades' && (
          <>
            {loading ? (
              <p className="text-slate-400">Loading missed trades...</p>
            ) : missed.length === 0 ? (
              <p className="text-slate-400">No missed trades logged.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="p-3 text-left text-slate-300">Date</th>
                      <th className="p-3 text-left text-slate-300">Pair</th>
                      <th className="p-3 text-left text-slate-300">Direction</th>
                      <th className="p-3 text-left text-slate-300">Pattern</th>
                      <th className="p-3 text-left text-slate-300">Before Link</th>
                      <th className="p-3 text-left text-slate-300">After Link</th>
                      <th className="p-3 text-left text-slate-300">Potential Return (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missed.map((row, idx) => (
                      <tr key={row.id || idx} className={idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'}>
                        <td className="p-3 text-sm text-slate-300">{row.created_at ? new Date(row.created_at).toLocaleDateString() : '-'}</td>
                        <td className="p-3 font-semibold text-slate-100">{row.pair}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${row.direction === 'long' ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800' : 'bg-red-900/40 text-red-300 border border-red-800'}`}>
                            {row.direction?.toUpperCase() || '-'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">{row.pattern || '-'}</td>
                        <td className="p-3">{row.before_url ? <a href={row.before_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 text-xs underline">Before</a> : <span className="text-slate-500 text-xs">-</span>}</td>
                        <td className="p-3">{row.after_url ? <a href={row.after_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs underline">After</a> : <span className="text-slate-500 text-xs">-</span>}</td>
                        <td className="p-3">{(row.potential_return !== null && row.potential_return !== undefined && row.potential_return !== '') ? (
                          <span className={`${row.potential_return >= 0 ? 'text-emerald-400' : 'text-red-400'} font-semibold`}>{parseFloat(row.potential_return).toFixed(2)}%</span>
                        ) : <span className="text-slate-500">-</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ---------- New Trade View (executed) ---------- */
const NewTradeView = ({ setCurrentView, formData, setFormData, isSubmitting, setIsSubmitting, message, setMessage }) => {
  const [currentBalance, setCurrentBalance] = useState(0)
  const [balanceLoading, setBalanceLoading] = useState(true)

  useEffect(() => {
    const loadCurrentBalance = async () => {
      setBalanceLoading(true)
      try {
        const { data: history, error } = await supabase
          .from('balance_history')
          .select('balance')
          .order('created_at', { ascending: false })
          .limit(1)

        if (error) throw error
        setCurrentBalance(history[0]?.balance || 0)
      } catch (err) {
        console.error('Error loading balance:', err.message)
      }
      setBalanceLoading(false)
    }
    loadCurrentBalance()
  }, [])

  const maxRisk = currentBalance * 0.005
  const validateRisk = () => {
    const riskAmount = parseFloat(formData.risk_amount) || 0
    const exceedsLimit = riskAmount > maxRisk
    return { exceedsLimit, riskAmount }
  }
  const riskValidation = validateRisk()

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('trades')
        .insert([{
          pair: formData.pair.toUpperCase(),
          direction: formData.direction,
          stopsize: formData.stopsize ? parseFloat(formData.stopsize) : null,
          risk_amount: formData.risk_amount ? parseFloat(formData.risk_amount) : null,
          entry_url: formData.entry_url || null,
          entrytype: formData.entrytype,
          rule3: formData.rule3,
          zone: formData.zone,
          pattern_traded: formData.pattern_traded || null,
          notes: formData.notes || null,
          status: 'open'
        }])

      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage('Trade added successfully!')
        setFormData({
          pair: '',
          direction: 'long',
          stopsize: '',
          entry_url: '',
          entrytype: 'RE',
          rule3: 'Impulsive',
          zone: 'Red',
          pattern_traded: '',
          risk_amount: '',
          notes: ''
        })
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }

    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors">← Back to Menu</button>
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Enter New Trade</h1>
          <div className="text-right">
            {balanceLoading ? (
              <div className="text-slate-400">Loading balance...</div>
            ) : (
              <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg">
                <div className="text-sm text-slate-400">Account Balance</div>
                <div className="text-lg font-semibold text-slate-100">${currentBalance.toFixed(2)}</div>
                <div className="text-sm text-emerald-400">Max Risk (0.5%): ${maxRisk.toFixed(2)}</div>
              </div>
            )}
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-6 border ${message.includes('Error') ? 'bg-red-900/20 text-red-300 border-red-800' : 'bg-emerald-900/20 text-emerald-300 border-emerald-800'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-slate-800 border border-slate-700 p-6 rounded-lg">
          <InputField label="Currency Pair" value={formData.pair} onChange={(e) => handleInputChange('pair', e.target.value)} placeholder="e.g., EURUSD, GBPJPY" required />
          <SelectField label="Direction" value={formData.direction} onChange={(e) => handleInputChange('direction', e.target.value)} options={[{ value: 'long', label: 'Long (Buy)' }, { value: 'short', label: 'Short (Sell)' }]} required />
          <InputField label="Stop Size" type="number" step="0.00001" value={formData.stopsize} onChange={(e) => handleInputChange('stopsize', e.target.value)} placeholder="e.g., 0.00150" />
          <div className="mb-4">
            <InputField label="Risk Amount ($)" type="number" step="0.01" value={formData.risk_amount} onChange={(e) => handleInputChange('risk_amount', e.target.value)} placeholder={`Max: ${maxRisk.toFixed(2)}`} required />
            {formData.risk_amount && (
              <div className={`mt-2 p-2 rounded text-sm ${riskValidation.exceedsLimit ? 'bg-red-900/20 text-red-300 border border-red-800' : 'bg-emerald-900/20 text-emerald-300 border border-emerald-800'}`}>
                {riskValidation.exceedsLimit ? `Risk exceeds 0.5% limit (${maxRisk.toFixed(2)})` : `Risk within limit (${((riskValidation.riskAmount / currentBalance) * 100).toFixed(2)}% of balance)`}
              </div>
            )}
          </div>
          <SelectField label="Entry Type" value={formData.entrytype} onChange={(e) => handleInputChange('entrytype', e.target.value)} options={[{ value: 'RE', label: 'RE' }, { value: 'RRE', label: 'RRE' }]} required />
          <SelectField label="Rule 3" value={formData.rule3} onChange={(e) => handleInputChange('rule3', e.target.value)} options={[{ value: 'Impulsive', label: 'Impulsive' }, { value: 'Structural', label: 'Structural' }, { value: 'Corrective', label: 'Corrective' }]} required />
          <SelectField label="Zone" value={formData.zone} onChange={(e) => handleInputChange('zone', e.target.value)} options={[{ value: 'Red', label: 'Red' }, { value: 'Yellow', label: 'Yellow' }, { value: 'Green', label: 'Green' }]} required />
          <SelectField label="Pattern Traded" value={formData.pattern_traded} onChange={(e) => handleInputChange('pattern_traded', e.target.value)} options={[
            { value: '', label: 'Select a pattern...' },
            { value: 'Bull Flag', label: 'Bull Flag' },
            { value: 'Bear Flag', label: 'Bear Flag' },
            { value: 'Flat Flag', label: 'Flat Flag' },
            { value: 'Symmetrical Triangle', label: 'Symmetrical Triangle' },
            { value: 'Expanding Triangle', label: 'Expanding Triangle' },
            { value: 'Falcon Flag', label: 'Falcon Flag' },
            { value: 'Ascending Channel', label: 'Ascending Channel' },
            { value: 'Descending Channel', label: 'Descending Channel' },
            { value: 'Rising Wedge', label: 'Rising Wedge' },
            { value: 'Falling Wedge', label: 'Falling Wedge' },
            { value: 'H&S', label: 'H&S' },
            { value: 'Double Top', label: 'Double Top' },
            { value: 'Double Bottom', label: 'Double Bottom' },
            { value: 'The Arc', label: 'The Arc' },
            { value: 'Structural Test', label: 'Structural Test' },
            { value: 'Hook Point', label: 'Hook Point' },
            { value: 'Reverse M Style', label: 'Reverse M Style' },
            { value: 'M Style', label: 'M Style' }
          ]} required />
          <InputField label="Entry Chart/Analysis URL (Optional)" type="url" value={formData.entry_url} onChange={(e) => handleInputChange('entry_url', e.target.value)} placeholder="https://tradingview.com/chart/..." />
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-slate-300">Notes (Optional)</label>
            <textarea value={formData.notes} onChange={(e) => handleInputChange('notes', e.target.value)} placeholder="Trade setup, reasons, strategy..." rows="4" className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400" />
          </div>
          <button type="submit" disabled={isSubmitting || riskValidation.exceedsLimit} className="w-full p-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white rounded-lg font-semibold transition-colors">
            {riskValidation.exceedsLimit ? 'Risk Exceeds 0.5% Limit' : isSubmitting ? 'Adding Trade...' : 'Add Trade'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ---------- DEFAULT EXPORT: Home page (menu) ---------- */
export default function Home() {
  const [currentView, setCurrentView] = useState('menu')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const [formData, setFormData] = useState({
    pair: '',
    direction: 'long',
    stopsize: '',
    entry_url: '',
    entrytype: 'RE',
    rule3: 'Impulsive',
    zone: 'Red',
    pattern_traded: '',
    risk_amount: '',
    notes: ''
  })

  if (currentView === 'menu') {
    return (
      <div className="min-h-screen bg-gray-950 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-8">
          <h1 className="text-5xl font-bold mb-12 text-slate-100">Trading Journal</h1>
          <div className="space-y-4">
            <MenuButton onClick={() => setCurrentView('new-trade')} className="bg-emerald-600 hover:bg-emerald-700 border-emerald-500 text-white">Enter New Trade</MenuButton>
            <MenuButton onClick={() => setCurrentView('update-trade')} className="bg-emerald-600 hover:bg-emerald-700 border-emerald-500 text-white">Update Existing Trade</MenuButton>
            <MenuButton onClick={() => setCurrentView('view-data')} className="bg-emerald-600 hover:bg-emerald-700 border-emerald-500 text-white">View Historical Data</MenuButton>
            <MenuButton onClick={() => setCurrentView('missed-trade')} className="bg-emerald-600 hover:bg-emerald-700 border-emerald-500 text-white">Log Missed Trade</MenuButton>
            <MenuButton onClick={() => setCurrentView('missed-data')} className="bg-emerald-600 hover:bg-emerald-700 border-emerald-500 text-white">View Missed Trades History</MenuButton>
            <MenuButton onClick={() => setCurrentView('trading-plan')} className="bg-emerald-600 hover:bg-emerald-700 border-emerald-500 text-white">Trading Plan</MenuButton>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'new-trade') {
    return (
      <NewTradeView 
        setCurrentView={setCurrentView}
        formData={formData}
        setFormData={setFormData}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
        message={message}
        setMessage={setMessage}
      />
    )
  }

  if (currentView === 'update-trade') {
    return (
      <UpdateTradeView 
        setCurrentView={setCurrentView} 
        setMessage={setMessage} 
        message={message} 
        isSubmitting={isSubmitting} 
        setIsSubmitting={setIsSubmitting} 
      />
    )
  }

  if (currentView === 'view-data') return <ViewHistoricalData setCurrentView={setCurrentView} />
  if (currentView === 'missed-trade') return <MissedTradeView setCurrentView={setCurrentView} />
  if (currentView === 'missed-data') return <ViewMissedTrades setCurrentView={setCurrentView} />
  if (currentView === 'trading-plan') return <TradingPlanView setCurrentView={setCurrentView} />
  return null
}

/* ---------- Trading Plan (editable) ---------- */
const TradingPlanView = ({ setCurrentView }) => {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [planId, setPlanId] = useState(null)

  useEffect(() => {
    const loadPlan = async () => {
      setLoading(true)
      setMessage('')
      try {
        const { data, error } = await supabase
          .from('trading_plan')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)

        if (error) throw error
        if (data && data.length > 0) {
          setContent(data[0].content || '')
          setLastUpdated(data[0].updated_at)
          setPlanId(data[0].id)
        } else {
          setContent('')
          setLastUpdated(null)
          setPlanId(null)
        }
      } catch (err) {
        setMessage(`Error: ${err.message}`)
      }
      setLoading(false)
    }
    loadPlan()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      if (planId) {
        const { error, data } = await supabase
          .from('trading_plan')
          .update({ content })
          .eq('id', planId)
          .select()
          .limit(1)
        if (error) throw error
        const row = data?.[0]
        setLastUpdated(row?.updated_at || new Date().toISOString())
        setMessage('Trading plan saved!')
      } else {
        const { error, data } = await supabase
          .from('trading_plan')
          .insert([{ content }])
          .select()
          .limit(1)
        if (error) throw error
        const row = data?.[0]
        setPlanId(row?.id || null)
        setLastUpdated(row?.updated_at || new Date().toISOString())
        setMessage('Trading plan created!')
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors">← Back to Menu</button>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-baseline justify-between mb-4">
          <h1 className="text-3xl font-bold">Trading Plan</h1>
          <div className="text-sm text-slate-400">
            {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleString()}` : 'No plan saved yet'}
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-6 border ${message.startsWith('Error') ? 'bg-red-900/20 text-red-300 border-red-800' : 'bg-emerald-900/20 text-emerald-300 border-emerald-800'}`}>
            {message}
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg">
          {loading ? (
            <div className="text-slate-400">Loading trading plan...</div>
          ) : (
            <>
              <label className="block text-sm font-medium mb-2 text-slate-300">Your Trading Plan</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Document your strategy, criteria, risk rules, and review checklist here..."
                rows={18}
                className="w-full p-4 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-500"
              />
              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-slate-500">Tip: Use this space to outline entry criteria, risk management, and review routines.</div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
