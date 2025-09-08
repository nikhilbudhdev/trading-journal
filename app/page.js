'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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

const BalanceManager = ({ setCurrentView }) => {
  const [currentBalance, setCurrentBalance] = useState(0)
  const [balanceHistory, setBalanceHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddBalance, setShowAddBalance] = useState(false)
  const [newBalance, setNewBalance] = useState({
    amount: '',
    reason: ''
  })

  useEffect(() => {
    loadBalanceData()
  }, [])

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
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              Add Transaction
            </button>
            <button
              type="button"
              onClick={() => setShowAddBalance(false)}
              className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <h3 className="p-4 font-semibold border-b border-slate-700 text-slate-100">Recent Balance Changes</h3>
        <div className="max-h-60 overflow-y-auto">
          {balanceHistory.slice(0, 10).map((entry) => (
            <div key={entry.id} className="p-4 border-b border-slate-700 last:border-b-0">
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

const UpdateTradeView = ({ setCurrentView, setMessage, message, isSubmitting, setIsSubmitting }) => {
  const [openTrades, setOpenTrades] = useState([])
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updateData, setUpdateData] = useState({
    exit_url: '',
    pnl: '',
    notes: ''
  })

  useEffect(() => {
    const loadOpenTrades = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('status', 'open')
          .order('entry_date', { ascending: false })

        if (error) {
          setMessage(`Error loading trades: ${error.message}`)
        } else {
          setOpenTrades(data || [])
        }
      } catch (err) {
        setMessage(`Error: ${err.message}`)
      }
      setLoading(false)
    }

    loadOpenTrades()
  }, [])

  const handleUpdateTrade = async (e) => {
    e.preventDefault()
    if (!selectedTrade) return

    setIsSubmitting(true)
    setMessage('')

    try {
      const { data, error } = await supabase
        .from('trades')
        .update({
          exit_date: new Date().toISOString(),
          exit_url: updateData.exit_url || null,
          pnl: updateData.pnl ? parseFloat(updateData.pnl) : null,
          notes: updateData.notes || selectedTrade.notes,
          status: 'closed'
        })
        .eq('id', selectedTrade.id)

      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage('Trade updated successfully!')
        setSelectedTrade(null)
        setUpdateData({ exit_url: '', pnl: '', notes: '' })
        
        const { data: updatedTrades } = await supabase
          .from('trades')
          .select('*')
          .eq('status', 'open')
          .order('entry_date', { ascending: false })
        setOpenTrades(updatedTrades || [])
      }
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
          <div className={`p-4 rounded-lg mb-6 border ${
            message.includes('Error') 
              ? 'bg-red-900/20 text-red-300 border-red-800' 
              : 'bg-emerald-900/20 text-emerald-300 border-emerald-800'
          }`}>
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-slate-400">Loading open trades...</p>
        ) : openTrades.length === 0 ? (
          <p className="text-slate-400">No open trades found.</p>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Open Trades ({openTrades.length})</h2>
            
            <div className="grid gap-4">
              {openTrades.map((trade) => (
                <div 
                  key={trade.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTrade?.id === trade.id 
                      ? 'border-emerald-500 bg-emerald-900/20' 
                      : 'border-slate-700 hover:border-slate-600 bg-slate-800'
                  }`}
                  onClick={() => setSelectedTrade(trade)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {trade.pair} - {trade.direction.toUpperCase()}
                      </h3>
                      <p className="text-slate-400 text-sm">
                        Entry: {new Date(trade.entry_date).toLocaleDateString()}
                      </p>
                      <p className="text-slate-500 text-sm">
                        Type: {trade.entrytype} | Rule3: {trade.rule3} | Zone: {trade.zone}
                      </p>
                      {trade.pattern_traded && (
                        <p className="text-slate-500 text-sm">Pattern: {trade.pattern_traded}</p>
                      )}
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
                <h3 className="text-xl font-semibold mb-4">
                  Close Trade: {selectedTrade.pair} - {selectedTrade.direction.toUpperCase()}
                </h3>
                
                <form onSubmit={handleUpdateTrade} className="space-y-4">
                  <InputField
                    label="Exit Chart/Analysis URL (Optional)"
                    type="url"
                    value={updateData.exit_url}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, exit_url: e.target.value }))}
                    placeholder="https://tradingview.com/chart/..."
                  />

                  <InputField
                    label="P&L"
                    type="number"
                    step="0.01"
                    value={updateData.pnl}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, pnl: e.target.value }))}
                    placeholder="e.g., 150.00 or -75.50"
                    required
                  />

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-slate-300">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      value={updateData.notes}
                      onChange={(e) => setUpdateData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Exit reasons, lessons learned..."
                      rows="3"
                      className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400"
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedTrade(null)}
                      className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
                    >
                      {isSubmitting ? 'Closing Trade...' : 'Close Trade'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const ViewHistoricalData = ({ setCurrentView }) => {
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const loadTrades = async () => {
      setLoading(true)
      try {
        let query = supabase.from('trades').select('*')
        
        if (filter !== 'all') {
          query = query.eq('status', filter)
        }
        
        const { data, error } = await query.order('entry_date', { ascending: false })

        if (error) {
          console.error('Error loading trades:', error.message)
        } else {
          setTrades(data || [])
        }
      } catch (err) {
        console.error('Error:', err.message)
      }
      setLoading(false)
    }

    loadTrades()
  }, [filter])

  const totalPnL = trades
    .filter(trade => trade.pnl !== null)
    .reduce((sum, trade) => sum + parseFloat(trade.pnl), 0)

  const winningTrades = trades.filter(trade => trade.pnl > 0).length
  const losingTrades = trades.filter(trade => trade.pnl < 0).length
  const winRate = trades.length > 0 ? ((winningTrades / (winningTrades + losingTrades)) * 100).toFixed(1) : 0

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
      <button 
        onClick={() => setCurrentView('menu')}
        className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors"
      >
        ← Back to Menu
      </button>
      
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">View Historical Data</h1>
        
        <BalanceManager setCurrentView={setCurrentView} />
        
        <h2 className="text-2xl font-bold mb-4">Trading Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
            <h3 className="text-sm text-slate-400">Total Trades</h3>
            <p className="text-2xl font-bold text-slate-100">{trades.length}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
            <h3 className="text-sm text-slate-400">Trading P&L</h3>
            <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ${totalPnL.toFixed(2)}
            </p>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
            <h3 className="text-sm text-slate-400">Win Rate</h3>
            <p className="text-2xl font-bold text-slate-100">{winRate}%</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
            <h3 className="text-sm text-slate-400">W/L Ratio</h3>
            <p className="text-2xl font-bold text-slate-100">{winningTrades}/{losingTrades}</p>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              filter === 'all' 
                ? 'bg-emerald-600 text-white border-emerald-500' 
                : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'
            }`}
          >
            All Trades
          </button>
          <button
            onClick={() => setFilter('open')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              filter === 'open' 
                ? 'bg-emerald-600 text-white border-emerald-500' 
                : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'
            }`}
          >
            Open Trades
          </button>
          <button
            onClick={() => setFilter('closed')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              filter === 'closed' 
                ? 'bg-emerald-600 text-white border-emerald-500' 
                : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'
            }`}
          >
            Closed Trades
          </button>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading trades...</p>
        ) : trades.length === 0 ? (
          <p className="text-slate-400">No trades found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
              <thead className="bg-slate-700">
                <tr>
                  <th className="p-3 text-left text-slate-300">Pair</th>
                  <th className="p-3 text-left text-slate-300">Direction</th>
                  <th className="p-3 text-left text-slate-300">Entry Date</th>
                  <th className="p-3 text-left text-slate-300">Type</th>
                  <th className="p-3 text-left text-slate-300">Rule3</th>
                  <th className="p-3 text-left text-slate-300">Zone</th>
                  <th className="p-3 text-left text-slate-300">Pattern</th>
                  <th className="p-3 text-left text-slate-300">Stop Size</th>
                  <th className="p-3 text-left text-slate-300">P&L</th>
                  <th className="p-3 text-left text-slate-300">Status</th>
                  <th className="p-3 text-left text-slate-300">Exit Date</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade, index) => (
                  <tr key={trade.id} className={index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'}>
                    <td className="p-3 font-semibold text-slate-100">{trade.pair}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        trade.direction === 'long' 
                          ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800' 
                          : 'bg-red-900/40 text-red-300 border border-red-800'
                      }`}>
                        {trade.direction.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-slate-300">
                      {new Date(trade.entry_date).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-slate-300">{trade.entrytype}</td>
                    <td className="p-3 text-slate-300">{trade.rule3}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${
                        trade.zone === 'Green' ? 'bg-emerald-900/40 text-emerald-300 border-emerald-800' :
                        trade.zone === 'Yellow' ? 'bg-yellow-900/40 text-yellow-300 border-yellow-800' :
                        'bg-red-900/40 text-red-300 border-red-800'
                      }`}>
                        {trade.zone}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">{trade.pattern_traded || '-'}</td>
                    <td className="p-3 text-slate-300">{trade.stopsize || '-'}</td>
                    <td className="p-3">
                      {trade.pnl ? (
                        <span className={`font-semibold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ${parseFloat(trade.pnl).toFixed(2)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${
                        trade.status === 'open' 
                          ? 'bg-blue-900/40 text-blue-300 border-blue-800' 
                          : 'bg-slate-700/40 text-slate-400 border-slate-600'
                      }`}>
                        {trade.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-slate-300">
                      {trade.exit_date ? new Date(trade.exit_date).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

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
    notes: ''
  })

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    try {
      const { data, error } = await supabase
        .from('trades')
        .insert([{
          pair: formData.pair.toUpperCase(),
          direction: formData.direction,
          stopsize: formData.stopsize ? parseFloat(formData.stopsize) : null,
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
          notes: ''
        })
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }

    setIsSubmitting(false)
  }

  if (currentView === 'menu') {
    return (
      <div className="min-h-screen bg-gray-950 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-8">
          <h1 className="text-5xl font-bold mb-12 text-slate-100">Trading Journal</h1>
          
          <div className="space-y-4">
            <MenuButton
              onClick={() => setCurrentView('new-trade')}
              className="bg-emerald-600 hover:bg-emerald-700 border-emerald-500 text-white"
            >
              Enter New Trade
            </MenuButton>
            
            <MenuButton
              onClick={() => setCurrentView('update-trade')}
              className="bg-emerald-600 hover:bg-emerald-700 border-emerald-500 text-white"
            >
              Update Existing Trade
            </MenuButton>
            
            <MenuButton
              onClick={() => setCurrentView('view-data')}
              className="bg-emerald-600 hover:bg-emerald-700 border-emerald-500 text-white"
            >
              View Historical Data
            </MenuButton>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'new-trade') {
    return (
      <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
        <button 
          onClick={() => setCurrentView('menu')}
          className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors"
        >
          ← Back to Menu
        </button>
        
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Enter New Trade</h1>
          
          {message && (
            <div className={`p-4 rounded-lg mb-6 border ${
              message.includes('Error') 
                ? 'bg-red-900/20 text-red-300 border-red-800' 
                : 'bg-emerald-900/20 text-emerald-300 border-emerald-800'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 bg-slate-800 border border-slate-700 p-6 rounded-lg">
            <InputField
              label="Currency Pair"
              value={formData.pair}
              onChange={(e) => handleInputChange('pair', e.target.value)}
              placeholder="e.g., EURUSD, GBPJPY"
              required
            />

            <SelectField
              label="Direction"
              value={formData.direction}
              onChange={(e) => handleInputChange('direction', e.target.value)}
              options={[
                { value: 'long', label: 'Long (Buy)' },
                { value: 'short', label: 'Short (Sell)' }
              ]}
              required
            />

            <InputField
              label="Stop Size"
              type="number"
              step="0.00001"
              value={formData.stopsize}
              onChange={(e) => handleInputChange('stopsize', e.target.value)}
              placeholder="e.g., 0.00150"
            />

            <SelectField
              label="Entry Type"
              value={formData.entrytype}
              onChange={(e) => handleInputChange('entrytype', e.target.value)}
              options={[
                { value: 'RE', label: 'RE' },
                { value: 'RRE', label: 'RRE' }
              ]}
              required
            />

            <SelectField
              label="Rule 3"
              value={formData.rule3}
              onChange={(e) => handleInputChange('rule3', e.target.value)}
              options={[
                { value: 'Impulsive', label: 'Impulsive' },
                { value: 'Structural', label: 'Structural' },
                { value: 'Corrective', label: 'Corrective' }
              ]}
              required
            />

            <SelectField
              label="Zone"
              value={formData.zone}
              onChange={(e) => handleInputChange('zone', e.target.value)}
              options={[
                { value: 'Red', label: 'Red' },
                { value: 'Yellow', label: 'Yellow' },
                { value: 'Green', label: 'Green' }
              ]}
              required
            />

            <SelectField
              label="Pattern Traded"
              value={formData.pattern_traded}
              onChange={(e) => handleInputChange('pattern_traded', e.target.value)}
              options={[
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
              ]}
              required
            />

            <InputField
              label="Entry Chart/Analysis URL (Optional)"
              type="url"
              value={formData.entry_url}
              onChange={(e) => handleInputChange('entry_url', e.target.value)}
              placeholder="https://tradingview.com/chart/..."
            />

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-slate-300">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Trade setup, reasons, strategy..."
                rows="4"
                className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full p-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
            >
              {isSubmitting ? 'Adding Trade...' : 'Add Trade'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (currentView === 'update-trade') {
    return <UpdateTradeView setCurrentView={setCurrentView} setMessage={setMessage} message={message} isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />
  }

  if (currentView === 'view-data') {
    return <ViewHistoricalData setCurrentView={setCurrentView} />
  }
}