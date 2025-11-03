'use client'

import { useCallback, useEffect, useState } from 'react'
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

const LONG_SHORT_OPTIONS = [
  { value: 'long', label: 'Long (Buy)' },
  { value: 'short', label: 'Short (Sell)' }
]

const MODE_CONFIG = {
  stocks: {
    key: 'stocks',
    journalTitle: "Nik's Stock Trading Journal",
    environmentTitle: 'Stock Trading Workspace',
    environmentDescription: 'Log, update, and review your equity trades with balance tracking and analytics.',
    homeButtonLabel: 'Stock Trades',
    menuTagline: 'Manage and analyze your stock positions.',
    accounts: [
      { value: 'CAD', label: 'CAD Account' },
      { value: 'USD', label: 'USD Account' }
    ],
    features: {
      missedTrades: true,
      analytics: true,
      tradingPlan: true
    },
    tables: {
      trades: 'stock_trades',
      balance: 'stock_balance_history',
      missed: 'stock_missed_trades',
      plan: 'stock_trading_plan'
    },
    tradeColumns: {
      instrument: 'ticker',
      direction: 'direction',
      stopSize: 'stopsize',
      riskAmount: 'risk_amount',
      entryUrl: 'entry_url',
      entryType: 'entrytype',
      rule: 'rule3',
      zone: 'zone',
      pattern: 'pattern_traded',
      notes: 'notes',
      status: 'status',
      pnl: 'pnl',
      entryDate: 'entry_date',
      exitDate: 'exit_date',
      exitUrl: 'exit_url',
      id: 'id',
      account: 'account_currency'
    },
    balanceColumns: {
      id: 'id',
      balance: 'balance',
      changeAmount: 'change_amount',
      reason: 'change_reason',
      tradeId: 'trade_id',
      createdAt: 'created_at',
      currency: 'currency'
    },
    missedColumns: {
      id: 'id',
      instrument: 'ticker',
      direction: 'direction',
      beforeUrl: 'before_url',
      afterUrl: 'after_url',
      pattern: 'pattern',
      potential: 'potential_return',
      createdAt: 'created_at'
    },
    planColumns: {
      id: 'id',
      content: 'content',
      updatedAt: 'updated_at'
    },
    labels: {
      instrument: 'Ticker Symbol',
      instrumentPlaceholder: 'e.g., AAPL, TSLA',
      pattern: 'Setup Traded',
      patternPlaceholder: 'Select a setup...',
      missedPattern: 'Setup Spotted',
      balanceTitle: 'Portfolio Balance',
      balanceHeroLabel: 'Portfolio Balance:',
      addBalanceButton: 'Record Cash Movement',
      addBalanceModalTitle: 'Record Deposit or Withdrawal',
      addBalancePlaceholder: 'e.g., Funding account, Broker fees',
      addBalanceSubmit: 'Record Movement',
      newBalanceToggleCancel: 'Cancel',
      historyTitle: 'Recent Balance Changes',
      balanceAccountsTitle: 'Account Balances',
      balanceAccountLabel: 'Account',
      newTradeButton: 'Log Stock Trade',
      updateTradeButton: 'Close Existing Stock Trade',
      viewDataButton: 'View Trade History',
      missedTradeButton: 'Log Missed Opportunity',
      missedDataButton: 'Review Missed Opportunities',
      tradingPlanButton: 'Stock Playbook',
      stopSizeLabel: 'Stop Distance ($)',
      entryUrlLabel: 'Idea/Chart URL (Optional)',
      notesLabel: 'Notes (Optional)',
      pnlLabel: 'P&L ($)',
      planTitle: 'Stock Playbook',
      planSave: 'Save Playbook',
      menuBack: '← All Workspaces',
      riskSummaryLabel: 'Portfolio Balance',
      analyticsInstrumentTitle: 'Ticker Performance',
      missedTableInstrument: 'Ticker',
      missedTablePattern: 'Setup',
      missedPatternPlaceholder: 'Select a setup...',
      newTradeTitle: 'Log Stock Trade',
      balanceToggleLabel: 'Record Cash Movement',
      accountLabel: 'Account'
    },
    analyticsLabels: {
      pattern: 'Top Performing Setups',
      zone: 'Price Zone Performance',
      entryType: 'Entry Trigger Performance',
      rule: 'Market Context Performance',
      day: 'Day of Week Performance',
      instrument: 'Ticker Performance'
    },
    missedAnalyticsLabels: {
      day: 'By Day of Week',
      instrument: 'By Ticker',
      pattern: 'Top Setups Missed'
    },
    patternOptions: [
      { value: '', label: 'Select a setup...' },
      { value: 'Breakout', label: 'Breakout' },
      { value: 'Pullback', label: 'Pullback' },
      { value: 'Trend Continuation', label: 'Trend Continuation' },
      { value: 'Gap and Go', label: 'Gap and Go' },
      { value: 'News Catalyst', label: 'News Catalyst' },
      { value: 'Earnings Drift', label: 'Earnings Drift' },
      { value: 'Reversal', label: 'Reversal' },
      { value: 'Base Breakout', label: 'Base Breakout' }
    ],
    entryTypeOptions: [
      { value: 'Breakout', label: 'Breakout' },
      { value: 'Pullback', label: 'Pullback' },
      { value: 'Reversal', label: 'Reversal' },
      { value: 'News Catalyst', label: 'News Catalyst' }
    ],
    ruleOptions: [
      { value: 'Trend', label: 'Trend' },
      { value: 'Range', label: 'Range' },
      { value: 'Reversal', label: 'Reversal' }
    ],
    zoneOptions: [
      { value: 'Accumulation', label: 'Accumulation' },
      { value: 'Breakout', label: 'Breakout' },
      { value: 'Distribution', label: 'Distribution' }
    ],
    missedPatternOptions: [
      { value: '', label: 'Select a setup...' },
      { value: 'Breakout', label: 'Breakout' },
      { value: 'Pullback', label: 'Pullback' },
      { value: 'Trend Continuation', label: 'Trend Continuation' },
      { value: 'Gap and Go', label: 'Gap and Go' },
      { value: 'Reversal', label: 'Reversal' }
    ],
    formDefaults: {
      instrument: '',
      direction: 'long',
      stopSize: '',
      riskAmount: '',
      entryUrl: '',
      entryType: 'Breakout',
      rule: 'Trend',
      zone: 'Breakout',
      pattern: '',
      notes: '',
      account: 'USD'
    },
    riskFraction: 0.005,
    stopSizeStep: '0.01',
    uppercaseInstrument: true,
    classes: {
      primaryButton: 'bg-sky-600 hover:bg-sky-700 border-sky-500 text-white',
      primaryAction: 'bg-sky-600 hover:bg-sky-700 text-white'
    }
  },
  forex: {
    key: 'forex',
    journalTitle: "Nik's FX Trading Journal",
    environmentTitle: 'Forex Trading Workspace',
    environmentDescription: 'Enter, update, and review your currency trades with analytics and balance tracking.',
    homeButtonLabel: 'Forex Trades',
    menuTagline: 'All of your forex tracking in one place.',
    features: {
      missedTrades: true,
      analytics: true,
      tradingPlan: true
    },
    accounts: [],
    tables: {
      trades: 'trades',
      balance: 'balance_history',
      missed: 'missed_trades',
      plan: 'trading_plan'
    },
    tradeColumns: {
      instrument: 'pair',
      direction: 'direction',
      stopSize: 'stopsize',
      riskAmount: 'risk_amount',
      entryUrl: 'entry_url',
      entryType: 'entrytype',
      rule: 'rule3',
      zone: 'zone',
      pattern: 'pattern_traded',
      notes: 'notes',
      status: 'status',
      pnl: 'pnl',
      entryDate: 'entry_date',
      exitDate: 'exit_date',
      exitUrl: 'exit_url',
      id: 'id',
      account: null
    },
    balanceColumns: {
      id: 'id',
      balance: 'balance',
      changeAmount: 'change_amount',
      reason: 'change_reason',
      tradeId: 'trade_id',
      createdAt: 'created_at',
      currency: null
    },
    missedColumns: {
      id: 'id',
      instrument: 'pair',
      direction: 'direction',
      beforeUrl: 'before_url',
      afterUrl: 'after_url',
      pattern: 'pattern',
      potential: 'potential_return',
      createdAt: 'created_at'
    },
    planColumns: {
      id: 'id',
      content: 'content',
      updatedAt: 'updated_at'
    },
    labels: {
      instrument: 'Currency Pair',
      instrumentPlaceholder: 'e.g., EURUSD, GBPJPY',
      pattern: 'Pattern Traded',
      patternPlaceholder: 'Select a pattern...',
      missedPattern: 'Pattern Spotted',
      balanceTitle: 'Account Balance',
      balanceHeroLabel: 'Account Balance:',
      addBalanceButton: 'Add Deposit/Withdrawal',
      addBalanceModalTitle: 'Add Deposit or Withdrawal',
      addBalancePlaceholder: 'e.g., Monthly deposit, Profit withdrawal',
      addBalanceSubmit: 'Add Transaction',
      newBalanceToggleCancel: 'Cancel',
      historyTitle: 'Recent Balance Changes',
      newTradeButton: 'Enter New Trade',
      updateTradeButton: 'Update Existing Trade',
      viewDataButton: 'View Historical Data',
      missedTradeButton: 'Log Missed Trade',
      missedDataButton: 'View Missed Trades History',
      tradingPlanButton: 'Trading Plan',
      stopSizeLabel: 'Stop Size',
      entryUrlLabel: 'Entry Chart/Analysis URL (Optional)',
      notesLabel: 'Notes (Optional)',
      pnlLabel: 'P&L ($)',
      planTitle: 'Trading Plan',
      planSave: 'Save Plan',
      menuBack: '← All Workspaces',
      riskSummaryLabel: 'Account Balance',
      analyticsInstrumentTitle: 'Currency Pair Performance',
      missedTableInstrument: 'Pair',
      missedTablePattern: 'Pattern',
      missedPatternPlaceholder: 'Select a pattern...',
      newTradeTitle: 'Enter New Trade',
      balanceToggleLabel: 'Add Deposit/Withdrawal',
      accountLabel: 'Account'
    },
    analyticsLabels: {
      pattern: 'Top Performing Patterns',
      zone: 'Zone Performance',
      entryType: 'Entry Type Performance',
      rule: 'Rule3 Performance',
      day: 'Day of Week Performance',
      instrument: 'Currency Pair Performance'
    },
    missedAnalyticsLabels: {
      day: 'By Day of Week',
      instrument: 'By Pair',
      pattern: 'Top Patterns Missed'
    },
    patternOptions: [
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
    ],
    entryTypeOptions: [
      { value: 'RE', label: 'RE' },
      { value: 'RRE', label: 'RRE' }
    ],
    ruleOptions: [
      { value: 'Impulsive', label: 'Impulsive' },
      { value: 'Structural', label: 'Structural' },
      { value: 'Corrective', label: 'Corrective' }
    ],
    zoneOptions: [
      { value: 'Red', label: 'Red' },
      { value: 'Yellow', label: 'Yellow' },
      { value: 'Green', label: 'Green' }
    ],
    missedPatternOptions: [
      { value: '', label: 'Select a pattern...' },
      { value: 'Bull Flag', label: 'Bull Flag' },
      { value: 'Bear Flag', label: 'Bear Flag' },
      { value: 'Falcon Flag', label: 'Falcon Flag' },
      { value: 'Hook Point', label: 'Hook Point' },
      { value: 'Double Top', label: 'Double Top' },
      { value: 'Double Bottom', label: 'Double Bottom' }
    ],
    formDefaults: {
      instrument: '',
      direction: 'long',
      stopSize: '',
      riskAmount: '',
      entryUrl: '',
      entryType: 'RE',
      rule: 'Impulsive',
      zone: 'Red',
      pattern: '',
      notes: '',
      account: ''
    },
    riskFraction: 0.005,
    stopSizeStep: '0.00001',
    uppercaseInstrument: true,
    classes: {
      primaryButton: 'bg-emerald-600 hover:bg-emerald-700 border-emerald-500 text-white',
      primaryAction: 'bg-emerald-600 hover:bg-emerald-700 text-white'
    }
  },
  options: {
    key: 'options',
    journalTitle: "Nik's Options Trading Journal",
    environmentTitle: 'Options Trading Workspace',
    environmentDescription: 'Track option contracts, cash flow, and post-trade notes for your call and put strategies.',
    homeButtonLabel: 'Options Trades',
    menuTagline: 'Capture your options trades with full contract details.',
    features: {
      missedTrades: false,
      analytics: false,
      tradingPlan: true
    },
    accounts: [],
    tables: {
      trades: 'options_trades',
      balance: 'options_balance_history',
      plan: 'options_trading_plan'
    },
    tradeColumns: {
      instrument: 'ticker',
      direction: 'position_side',
      optionType: 'option_type',
      strike: 'strike_price',
      expiry: 'expiry_date',
      contracts: 'contracts',
      premium: 'premium',
      entryUrl: 'entry_url',
      notes: 'notes',
      status: 'status',
      pnl: 'pnl',
      entryDate: 'entry_date',
      exitDate: 'exit_date',
      exitUrl: 'exit_url',
      id: 'id'
    },
    balanceColumns: {
      id: 'id',
      balance: 'balance',
      changeAmount: 'change_amount',
      reason: 'change_reason',
      tradeId: 'trade_id',
      createdAt: 'created_at',
      currency: null
    },
    planColumns: {
      id: 'id',
      content: 'content',
      updatedAt: 'updated_at'
    },
    labels: {
      instrument: 'Ticker Symbol',
      instrumentPlaceholder: 'e.g., AAPL',
      balanceTitle: 'Options Account Balance',
      balanceHeroLabel: 'Account Balance:',
      addBalanceButton: 'Add Deposit/Withdrawal',
      addBalanceModalTitle: 'Add Deposit or Withdrawal',
      addBalancePlaceholder: 'e.g., Funding account, Broker fees',
      addBalanceSubmit: 'Add Transaction',
      newBalanceToggleCancel: 'Cancel',
      historyTitle: 'Recent Balance Changes',
      newTradeButton: 'Log Option Trade',
      updateTradeButton: 'Close Existing Option Trade',
      viewDataButton: 'View Option History',
      tradingPlanButton: 'Options Playbook',
      stopSizeLabel: null,
      entryUrlLabel: 'Trade Notes URL (Optional)',
      notesLabel: 'Notes (Optional)',
      pnlLabel: 'P&L ($)',
      planTitle: 'Options Playbook',
      planSave: 'Save Playbook',
      menuBack: '← All Workspaces',
      riskSummaryLabel: 'Account Balance',
      analyticsInstrumentTitle: 'Ticker Performance',
      missedTableInstrument: 'Ticker',
      missedTablePattern: 'Pattern',
      missedPatternPlaceholder: 'Select a pattern...',
      newTradeTitle: 'Log Option Trade',
      balanceToggleLabel: 'Add Deposit/Withdrawal',
      optionTypeLabel: 'Option Type',
      directionLabel: 'Position',
      strikeLabel: 'Strike Price ($)',
      expiryLabel: 'Expiration Date',
      contractsLabel: 'Contracts',
      premiumLabel: 'Premium ($ per contract)'
    },
    optionTypeOptions: [
      { value: 'call', label: 'Call' },
      { value: 'put', label: 'Put' }
    ],
    directionOptions: [
      { value: 'long', label: 'Long (Buy)' },
      { value: 'short', label: 'Short (Sell)' }
    ],
    formDefaults: {
      instrument: '',
      optionType: 'call',
      direction: 'long',
      strike: '',
      expiry: '',
      contracts: '',
      premium: '',
      entryUrl: '',
      notes: ''
    },
    riskFraction: 0.005,
    stopSizeStep: null,
    uppercaseInstrument: true,
    classes: {
      primaryButton: 'bg-purple-600 hover:bg-purple-700 border-purple-500 text-white',
      primaryAction: 'bg-purple-600 hover:bg-purple-700 text-white'
    }
  }
}

const BalanceManager = ({ config }) => {
  const { tables, balanceColumns, labels, classes, accounts = [] } = config
  const balanceTable = tables.balance
  const createdAtColumn = balanceColumns.createdAt
  const balanceColumn = balanceColumns.balance
  const changeAmountColumn = balanceColumns.changeAmount
  const reasonColumn = balanceColumns.reason
  const idColumn = balanceColumns.id
  const currencyColumn = balanceColumns.currency

  const hasMultipleAccounts = accounts.length > 0 && currencyColumn

  const [currentBalance, setCurrentBalance] = useState(0)
  const [currentBalances, setCurrentBalances] = useState({})
  const [balanceHistory, setBalanceHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddBalance, setShowAddBalance] = useState(false)
  const [newBalance, setNewBalance] = useState({ amount: '', reason: '' })
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.value || '')

  useEffect(() => {
    if (accounts.length) {
      setSelectedAccount(accounts[0]?.value || '')
    }
  }, [accounts])

  const loadBalanceData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: history, error } = await supabase
        .from(balanceTable)
        .select('*')
        .order(createdAtColumn, { ascending: false })

      if (error) throw error
      const historyData = history || []
      setBalanceHistory(historyData)

      if (hasMultipleAccounts) {
        const balances = accounts.reduce((acc, account) => {
          const latest = historyData.find(entry => entry[currencyColumn] === account.value)
          acc[account.value] = latest ? parseFloat(latest[balanceColumn]) || 0 : 0
          return acc
        }, {})
        setCurrentBalances(balances)
      } else {
        const latest = historyData[0]
        setCurrentBalance(latest ? parseFloat(latest[balanceColumn]) || 0 : 0)
      }
    } catch (err) {
      console.error('Error loading balance:', err.message)
    }
    setLoading(false)
  }, [accounts, balanceTable, createdAtColumn, balanceColumn, currencyColumn, hasMultipleAccounts])

  useEffect(() => {
    loadBalanceData()
  }, [loadBalanceData])

  const handleAddBalance = async (e) => {
    e.preventDefault()
    if (!newBalance.amount) return

    try {
      const accountValue = hasMultipleAccounts ? (selectedAccount || accounts[0]?.value) : null
      if (hasMultipleAccounts && !accountValue) return

      const changeAmount = parseFloat(newBalance.amount)
      if (Number.isNaN(changeAmount)) return
      const baseBalance = hasMultipleAccounts
        ? parseFloat(currentBalances[accountValue] || 0)
        : parseFloat(currentBalance)
      const newBalanceAmount = baseBalance + changeAmount

      const payload = {
        [balanceColumn]: newBalanceAmount,
        [changeAmountColumn]: changeAmount,
        [reasonColumn]: newBalance.reason || (changeAmount > 0 ? 'Deposit' : 'Withdrawal')
      }

      if (hasMultipleAccounts && accountValue) {
        payload[currencyColumn] = accountValue
      }

      const { error } = await supabase
        .from(balanceTable)
        .insert([payload])

      if (error) throw error
      setShowAddBalance(false)
      setNewBalance({ amount: '', reason: '' })
      await loadBalanceData()

    } catch (err) {
      console.error('Error updating balance:', err.message)
    }
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-slate-100">{labels.balanceTitle}</h2>
        <button
          onClick={() => setShowAddBalance(prev => !prev)}
          className={`px-4 py-2 rounded-lg text-sm transition-colors border border-transparent ${classes.primaryAction}`}
        >
          {showAddBalance ? labels.newBalanceToggleCancel : labels.balanceToggleLabel}
        </button>
      </div>

      {hasMultipleAccounts ? (
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg mb-6">
          <h3 className="text-lg text-slate-400 mb-4">{labels.balanceAccountsTitle}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {accounts.map(account => (
              <div key={account.value} className="p-4 bg-slate-900/60 border border-slate-700 rounded-lg">
                <p className="text-sm text-slate-400">{account.label}</p>
                <p className="text-3xl font-bold text-emerald-400">
                  ${(currentBalances[account.value] || 0).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg mb-6">
          <div className="text-center">
            <h3 className="text-lg text-slate-400">{labels.balanceHeroLabel}</h3>
            <p className="text-4xl font-bold text-emerald-400">${currentBalance.toFixed(2)}</p>
          </div>
        </div>
      )}

      {showAddBalance && (
        <form onSubmit={handleAddBalance} className="bg-slate-800 border border-slate-700 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-4 text-slate-100">{labels.addBalanceModalTitle}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hasMultipleAccounts && (
              <SelectField
                label={labels.balanceAccountLabel}
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                options={accounts}
                required
              />
            )}
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
              placeholder={labels.addBalancePlaceholder}
            />
          </div>
          <div className="flex gap-4 mt-4">
            <button type="submit" className={`px-6 py-2 rounded-lg transition-colors ${classes.primaryAction}`}>
              {labels.addBalanceSubmit}
            </button>
            <button
              type="button"
              onClick={() => setShowAddBalance(false)}
              className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              {labels.newBalanceToggleCancel}
            </button>
          </div>
        </form>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <h3 className="p-4 font-semibold border-b border-slate-700 text-slate-100">{labels.historyTitle}</h3>
        <div className="max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-slate-400">Loading balance history...</div>
          ) : balanceHistory.length === 0 ? (
            <div className="p-4 text-slate-400">No balance history found.</div>
          ) : (
            balanceHistory.slice(0, 10).map((entry, index) => {
              const changeAmount = parseFloat(entry[changeAmountColumn]) || 0
              const balanceValue = parseFloat(entry[balanceColumn]) || 0
              const createdAt = entry[createdAtColumn]
              const currencyLabel = hasMultipleAccounts ? entry[currencyColumn] : null

              return (
                <div key={entry[idColumn] || index} className="p-4 border-b border-slate-700 last:border-b-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-slate-100">{entry[reasonColumn]}</p>
                      {currencyLabel && <p className="text-xs text-slate-500">Account: {currencyLabel}</p>}
                      <p className="text-sm text-slate-400">
                        {createdAt ? `${new Date(createdAt).toLocaleDateString()} at ${new Date(createdAt).toLocaleTimeString()}` : '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${changeAmount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {changeAmount >= 0 ? '+' : ''}${changeAmount.toFixed(2)}
                      </p>
                      <p className="text-sm text-slate-400">Balance: ${balanceValue.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

const UpdateTradeView = ({ setCurrentView, setMessage, message, isSubmitting, setIsSubmitting, config }) => {
  const { tables, tradeColumns, balanceColumns, labels, classes, accounts = [] } = config
  const tradesTable = tables.trades
  const balanceTable = tables.balance
  const statusColumn = tradeColumns.status
  const entryDateColumn = tradeColumns.entryDate
  const instrumentColumn = tradeColumns.instrument
  const directionColumn = tradeColumns.direction
  const entryTypeColumn = tradeColumns.entryType
  const ruleColumn = tradeColumns.rule
  const zoneColumn = tradeColumns.zone
  const patternColumn = tradeColumns.pattern
  const stopSizeColumn = tradeColumns.stopSize
  const notesColumn = tradeColumns.notes
  const exitUrlColumn = tradeColumns.exitUrl
  const exitDateColumn = tradeColumns.exitDate
  const pnlColumn = tradeColumns.pnl
  const balanceCreatedAt = balanceColumns.createdAt
  const balanceValueColumn = balanceColumns.balance
  const changeAmountColumn = balanceColumns.changeAmount
  const reasonColumn = balanceColumns.reason
  const currencyColumn = balanceColumns.currency
  const accountField = tradeColumns.account
  const hasMultipleAccounts = accounts.length > 0 && currencyColumn

  const [openTrades, setOpenTrades] = useState([])
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updateData, setUpdateData] = useState({ exitUrl: '', pnl: '', notes: '' })

  useEffect(() => {
    const loadOpenTrades = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from(tradesTable)
          .select('*')
          .eq(statusColumn, 'open')
          .order(entryDateColumn, { ascending: false })

        if (error) throw error
        setOpenTrades(data || [])
      } catch (err) {
        setMessage(`Error: ${err.message}`)
      }
      setLoading(false)
    }
    loadOpenTrades()
  }, [setMessage, tradesTable, statusColumn, entryDateColumn])

  const handleUpdateTrade = async (e) => {
    e.preventDefault()
    if (!selectedTrade) return
    setIsSubmitting(true)
    setMessage('')

    try {
      const pnlAmount = updateData.pnl ? parseFloat(updateData.pnl) : 0

      const { error } = await supabase
        .from(tradesTable)
        .update({
          [exitDateColumn]: new Date().toISOString(),
          [exitUrlColumn]: updateData.exitUrl || null,
          [pnlColumn]: pnlAmount,
          [notesColumn]: updateData.notes || selectedTrade[notesColumn] || null,
          [statusColumn]: 'closed'
        })
        .eq(tradeColumns.id, selectedTrade[tradeColumns.id])

      if (error) throw error

      if (pnlAmount !== 0) {
        const selectedAccount = accountField ? selectedTrade[accountField] : null
        let currentBalanceValue = 0

        if (hasMultipleAccounts && selectedAccount) {
          const { data: balanceHistory, error: balanceError } = await supabase
            .from(balanceTable)
            .select(`${balanceValueColumn}, ${currencyColumn}`)
            .eq(currencyColumn, selectedAccount)
            .order(balanceCreatedAt, { ascending: false })
            .limit(1)

          if (balanceError) throw balanceError
          currentBalanceValue = balanceHistory?.[0]?.[balanceValueColumn] || 0
        } else {
          const { data: balanceHistory, error: balanceError } = await supabase
            .from(balanceTable)
            .select(balanceValueColumn)
            .order(balanceCreatedAt, { ascending: false })
            .limit(1)

          if (balanceError) throw balanceError
          currentBalanceValue = balanceHistory?.[0]?.[balanceValueColumn] || 0
        }

        const newBalance = parseFloat(currentBalanceValue) + pnlAmount

        const balancePayload = {
          [balanceValueColumn]: newBalance,
          [changeAmountColumn]: pnlAmount,
          [reasonColumn]: `Trade P&L: ${selectedTrade[instrumentColumn]} ${selectedTrade[directionColumn] || ''}`,
          [balanceColumns.tradeId]: selectedTrade[tradeColumns.id]
        }

        if (hasMultipleAccounts && selectedAccount) {
          balancePayload[currencyColumn] = selectedAccount
        }

        const { error: balanceInsertError } = await supabase
          .from(balanceTable)
          .insert([balancePayload])

        if (balanceInsertError) throw balanceInsertError
      }

      setMessage('Trade updated successfully! Balance automatically adjusted.')
      setSelectedTrade(null)
      setUpdateData({ exitUrl: '', pnl: '', notes: '' })

      const { data: updatedTrades } = await supabase
        .from(tradesTable)
        .select('*')
        .eq(statusColumn, 'open')
        .order(entryDateColumn, { ascending: false })

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
        <h1 className="text-3xl font-bold mb-8">{config.labels.updateTradeButton}</h1>
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
              {openTrades.map(trade => {
                const metaParts = []
                if (entryTypeColumn) metaParts.push(`Type: ${trade[entryTypeColumn] || '-'}`)
                if (ruleColumn) metaParts.push(`Context: ${trade[ruleColumn] || '-'}`)
                if (zoneColumn) metaParts.push(`Zone: ${trade[zoneColumn] || '-'}`)

                const optionParts = []
                if (tradeColumns.optionType) optionParts.push(`Option: ${(trade[tradeColumns.optionType] || '').toString().toUpperCase()}`)
                if (tradeColumns.strike) optionParts.push(`${labels.strikeLabel || 'Strike'}: ${trade[tradeColumns.strike] ?? '-'}`)
                if (tradeColumns.expiry) optionParts.push(`${labels.expiryLabel || 'Expiry'}: ${trade[tradeColumns.expiry] ? new Date(trade[tradeColumns.expiry]).toLocaleDateString() : '-'}`)
                if (tradeColumns.contracts) optionParts.push(`${labels.contractsLabel || 'Contracts'}: ${trade[tradeColumns.contracts] ?? '-'}`)
                if (tradeColumns.premium) optionParts.push(`${labels.premiumLabel || 'Premium'}: ${trade[tradeColumns.premium] ?? '-'}`)

                return (
                  <div
                    key={trade[tradeColumns.id]}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedTrade?.[tradeColumns.id] === trade[tradeColumns.id] ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-700 hover:border-slate-600 bg-slate-800'}`}
                    onClick={() => setSelectedTrade(trade)}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">
                          {trade[instrumentColumn]}
                          {directionColumn && trade[directionColumn] ? ` - ${(trade[directionColumn] || '').toString().toUpperCase()}` : ''}
                        </h3>
                        <p className="text-slate-400 text-sm">Entry: {trade[entryDateColumn] ? new Date(trade[entryDateColumn]).toLocaleDateString() : '—'}</p>
                        {metaParts.length > 0 && <p className="text-slate-500 text-sm">{metaParts.join(' • ')}</p>}
                        {optionParts.length > 0 && <p className="text-slate-500 text-sm">{optionParts.join(' • ')}</p>}
                        {accountField && trade[accountField] && (
                          <p className="text-slate-500 text-sm">Account: {trade[accountField]}</p>
                        )}
                        {patternColumn && trade[patternColumn] && <p className="text-slate-500 text-sm">{config.labels.pattern}: {trade[patternColumn]}</p>}
                      </div>
                      <div className="text-right">
                        {stopSizeColumn && <p className="text-sm text-slate-400">Stop Size: {trade[stopSizeColumn] || '-'}</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {selectedTrade && (
              <div className="mt-8 p-6 bg-slate-800 border border-slate-700 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Close Trade: {selectedTrade[instrumentColumn]} - {(selectedTrade[directionColumn] || '').toString().toUpperCase()}</h3>
                <form onSubmit={handleUpdateTrade} className="space-y-4">
                  <InputField
                    label={config.labels.entryUrlLabel}
                    type="url"
                    value={updateData.exitUrl}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, exitUrl: e.target.value }))}
                    placeholder="https://tradingview.com/chart/..."
                  />
                  <InputField
                    label={config.labels.pnlLabel}
                    type="number"
                    step="0.01"
                    value={updateData.pnl}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, pnl: e.target.value }))}
                    placeholder="e.g., 150.00 or -75.50"
                    required
                  />
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-slate-300">{config.labels.notesLabel}</label>
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
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Closing...' : 'Close Trade'}
                    </button>
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

const TradingAnalytics = ({ trades, config }) => {
  if (config.features?.analytics === false) return null
  const { tradeColumns, analyticsLabels, labels } = config
  const statusColumn = tradeColumns.status
  const pnlColumn = tradeColumns.pnl
  const entryDateColumn = tradeColumns.entryDate
  const instrumentColumn = tradeColumns.instrument

  const closedTrades = trades.filter(trade => trade[statusColumn] === 'closed' && trade[pnlColumn] !== null && trade[pnlColumn] !== undefined)
  if (closedTrades.length < 5) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4 text-slate-100">Trading Analytics</h2>
        <p className="text-slate-400">Need at least 5 completed trades for meaningful analysis. Current: {closedTrades.length}</p>
      </div>
    )
  }

  const calculateStats = (field) => {
    if (!field) return {}
    const stats = {}
    closedTrades.forEach(trade => {
      const key = trade[field]
      if (key) {
        if (!stats[key]) stats[key] = { wins: 0, losses: 0, totalPnL: 0, count: 0 }
        stats[key].count++
        const pnlValue = parseFloat(trade[pnlColumn]) || 0
        stats[key].totalPnL += pnlValue
        if (pnlValue > 0) stats[key].wins++
        else if (pnlValue < 0) stats[key].losses++
      }
    })
    return stats
  }

  const patternStats = calculateStats(tradeColumns.pattern)
  const zoneStats = calculateStats(tradeColumns.zone)
  const entryTypeStats = calculateStats(tradeColumns.entryType)
  const ruleStats = calculateStats(tradeColumns.rule)
  const instrumentStats = calculateStats(instrumentColumn)

  const dayStats = {}
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  closedTrades.forEach(trade => {
    const entryDate = trade[entryDateColumn]
    if (!entryDate) return
    const day = dayNames[new Date(entryDate).getDay()]
    if (!dayStats[day]) dayStats[day] = { wins: 0, losses: 0, totalPnL: 0, count: 0 }
    const pnlValue = parseFloat(trade[pnlColumn]) || 0
    dayStats[day].count++
    dayStats[day].totalPnL += pnlValue
    if (pnlValue > 0) dayStats[day].wins++
    else if (pnlValue < 0) dayStats[day].losses++
  })

  const winningTrades = closedTrades.filter(t => parseFloat(t[pnlColumn]) > 0)
  const losingTrades = closedTrades.filter(t => parseFloat(t[pnlColumn]) < 0)
  const avgWin = winningTrades.length ? winningTrades.reduce((sum, t) => sum + (parseFloat(t[pnlColumn]) || 0), 0) / winningTrades.length : 0
  const avgLoss = losingTrades.length ? Math.abs(losingTrades.reduce((sum, t) => sum + (parseFloat(t[pnlColumn]) || 0), 0) / losingTrades.length) : 0
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
            const winRate = data.count > 0 ? ((data.wins / data.count) * 100).toFixed(1) : '0.0'
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
              <span className={`font-semibold ${closedTrades.reduce((sum, t) => sum + (parseFloat(t[pnlColumn]) || 0), 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${closedTrades.reduce((sum, t) => sum + (parseFloat(t[pnlColumn]) || 0), 0).toFixed(2)}
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
        <StatCard title={analyticsLabels.pattern} stats={patternStats} />
        <StatCard title={analyticsLabels.zone} stats={zoneStats} />
        <StatCard title={analyticsLabels.entryType} stats={entryTypeStats} />
        <StatCard title={analyticsLabels.rule} stats={ruleStats} />
        <StatCard title={analyticsLabels.day} stats={dayStats} />
        <StatCard title={analyticsLabels.instrument} stats={instrumentStats} />
      </div>
    </div>
  )
}

const ViewHistoricalData = ({ setCurrentView, config }) => {
  const { tables, tradeColumns, labels, riskFraction, accounts = [] } = config
  const tradesTable = tables.trades
  const statusColumn = tradeColumns.status
  const entryDateColumn = tradeColumns.entryDate
  const instrumentColumn = tradeColumns.instrument
  const entryTypeColumn = tradeColumns.entryType
  const ruleColumn = tradeColumns.rule
  const zoneColumn = tradeColumns.zone
  const patternColumn = tradeColumns.pattern
  const pnlColumn = tradeColumns.pnl
  const notesColumn = tradeColumns.notes
  const entryUrlColumn = tradeColumns.entryUrl
  const accountField = tradeColumns.account
  const optionTypeColumn = tradeColumns.optionType
  const strikeColumn = tradeColumns.strike
  const expiryColumn = tradeColumns.expiry
  const contractsColumn = tradeColumns.contracts
  const premiumColumn = tradeColumns.premium
  const directionColumn = tradeColumns.direction
  const hasMultipleAccounts = accounts.length > 0 && config.balanceColumns.currency
  const showAnalytics = config.features?.analytics !== false

  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('overview')
  const [currentBalance, setCurrentBalance] = useState(0)

  useEffect(() => {
    const loadTrades = async () => {
      setLoading(true)
      try {
        let query = supabase.from(tradesTable).select('*')
        if (filter !== 'all') query = query.eq(statusColumn, filter)
        const { data, error } = await query.order(entryDateColumn, { ascending: false })
        if (error) throw error
        setTrades(data || [])
      } catch (err) {
        console.error('Error:', err.message)
      }
      setLoading(false)
    }
    loadTrades()
  }, [filter, tradesTable, statusColumn, entryDateColumn])

  useEffect(() => {
    const loadCurrentBalance = async () => {
      try {
        const { data: history, error } = await supabase
          .from(config.tables.balance)
          .select('*')
          .order(config.balanceColumns.createdAt, { ascending: false })
        if (error) throw error
        const historyData = history || []
        if (hasMultipleAccounts) {
          const balances = accounts.reduce((acc, account) => {
            const latest = historyData.find(entry => entry[config.balanceColumns.currency] === account.value)
            acc[account.value] = latest ? parseFloat(latest[config.balanceColumns.balance]) || 0 : 0
            return acc
          }, {})
          const total = Object.values(balances).reduce((sum, value) => sum + value, 0)
          setCurrentBalance(total)
        } else {
          const latest = historyData[0]
          setCurrentBalance(latest ? parseFloat(latest[config.balanceColumns.balance]) || 0 : 0)
        }
      } catch (err) {
        console.error('Error loading balance:', err.message)
      }
    }
    loadCurrentBalance()
  }, [accounts, config.tables.balance, config.balanceColumns.balance, config.balanceColumns.createdAt, config.balanceColumns.currency, hasMultipleAccounts])

  const totalPnL = trades.filter(t => t[pnlColumn] !== null && t[pnlColumn] !== undefined).reduce((sum, t) => sum + (parseFloat(t[pnlColumn]) || 0), 0)
  const totalPnLPercent = currentBalance > 0 ? (totalPnL / currentBalance) * 100 : 0
  const winningTrades = trades.filter(t => (parseFloat(t[pnlColumn]) || 0) > 0).length
  const losingTrades = trades.filter(t => (parseFloat(t[pnlColumn]) || 0) < 0).length
  const winRate = trades.length > 0 ? ((winningTrades / (winningTrades + losingTrades)) * 100).toFixed(1) : 0

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors">← Back to Menu</button>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">{labels.viewDataButton}</h1>

        <BalanceManager config={config} />

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <h3 className="text-sm text-slate-400">Total Trades</h3>
              <p className="text-2xl font-bold text-slate-100">{trades.length}</p>
            </div>
            <div>
              <h3 className="text-sm text-slate-400">Win Rate</h3>
              <p className="text-2xl font-bold text-slate-100">{winRate}%</p>
            </div>
            <div>
              <h3 className="text-sm text-slate-400">Closed P&L</h3>
              <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>${totalPnL.toFixed(2)}</p>
            </div>
            <div>
              <h3 className="text-sm text-slate-400">P&L vs Balance</h3>
              <p className={`text-2xl font-bold ${totalPnLPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{totalPnLPercent.toFixed(2)}%</p>
              <p className="text-xs text-slate-500 mt-1">Assumes {labels.riskSummaryLabel.toLowerCase()} of ${currentBalance.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === 'overview' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'}`}>Overview</button>
          {showAnalytics && (
            <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === 'analytics' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'}`}>Analytics</button>
          )}
          <button onClick={() => setActiveTab('trades')} className={`px-4 py-2 rounded-lg border transition-colors ${activeTab === 'trades' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'}`}>Trades Table</button>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Open Trades</h3><p className="text-2xl font-bold text-slate-100">{trades.filter(t => t[statusColumn] === 'open').length}</p></div>
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Closed Trades</h3><p className="text-2xl font-bold text-slate-100">{trades.filter(t => t[statusColumn] === 'closed').length}</p></div>
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg"><h3 className="text-sm text-slate-400">Risk Budget (0.5%)</h3><p className="text-2xl font-bold text-slate-100">${(currentBalance * riskFraction).toFixed(2)}</p></div>
          </div>
        )}

        {showAnalytics && activeTab === 'analytics' && <TradingAnalytics trades={trades} config={config} />}

        {activeTab === 'trades' && (
          <>
            <div className="flex flex-wrap gap-3 mb-4">
              <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded border text-sm ${filter === 'all' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'}`}>All</button>
              <button onClick={() => setFilter('open')} className={`px-3 py-1 rounded border text-sm ${filter === 'open' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'}`}>Open</button>
              <button onClick={() => setFilter('closed')} className={`px-3 py-1 rounded border text-sm ${filter === 'closed' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'}`}>Closed</button>
            </div>
            {loading ? (
              <p className="text-slate-400">Loading trades...</p>
            ) : trades.length === 0 ? (
              <p className="text-slate-400">No trades found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full bg-slate-800 rounded-lg overflow-hidden border border-slate-700 text-sm">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="p-3 text-left text-slate-300">Entry Date</th>
                      <th className="p-3 text-left text-slate-300">{labels.instrument}</th>
                      {accountField && <th className="p-3 text-left text-slate-300">Account</th>}
                      {directionColumn && <th className="p-3 text-left text-slate-300">{labels.directionLabel || 'Direction'}</th>}
                      {optionTypeColumn && <th className="p-3 text-left text-slate-300">{labels.optionTypeLabel || 'Option Type'}</th>}
                      {strikeColumn && <th className="p-3 text-left text-slate-300">{labels.strikeLabel || 'Strike'}</th>}
                      {expiryColumn && <th className="p-3 text-left text-slate-300">{labels.expiryLabel || 'Expiry'}</th>}
                      {contractsColumn && <th className="p-3 text-left text-slate-300">{labels.contractsLabel || 'Contracts'}</th>}
                      {premiumColumn && <th className="p-3 text-left text-slate-300">{labels.premiumLabel || 'Premium'}</th>}
                      {entryTypeColumn && <th className="p-3 text-left text-slate-300">Entry Type</th>}
                      {ruleColumn && <th className="p-3 text-left text-slate-300">Context</th>}
                      {zoneColumn && <th className="p-3 text-left text-slate-300">Zone</th>}
                      {patternColumn && <th className="p-3 text-left text-slate-300">{labels.pattern}</th>}
                      {entryUrlColumn && <th className="p-3 text-left text-slate-300">Entry Link</th>}
                      <th className="p-3 text-left text-slate-300">Status</th>
                      <th className="p-3 text-left text-slate-300">{labels.pnlLabel}</th>
                      {notesColumn && <th className="p-3 text-left text-slate-300">{labels.notesLabel}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade, idx) => (
                      <tr key={trade[tradeColumns.id] || idx} className={idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'}>
                        <td className="p-3 text-slate-300">{trade[entryDateColumn] ? new Date(trade[entryDateColumn]).toLocaleDateString() : '-'}</td>
                        <td className="p-3 font-semibold text-slate-100">{trade[instrumentColumn]}</td>
                        {accountField && <td className="p-3 text-slate-300">{trade[accountField] || '-'}</td>}
                        {directionColumn && <td className="p-3 text-slate-300">{(trade[directionColumn] || '').toString().toUpperCase()}</td>}
                        {optionTypeColumn && <td className="p-3 text-slate-300">{(trade[optionTypeColumn] || '').toString().toUpperCase()}</td>}
                        {strikeColumn && <td className="p-3 text-slate-300">{trade[strikeColumn] ?? '-'}</td>}
                        {expiryColumn && <td className="p-3 text-slate-300">{trade[expiryColumn] ? new Date(trade[expiryColumn]).toLocaleDateString() : '-'}</td>}
                        {contractsColumn && <td className="p-3 text-slate-300">{trade[contractsColumn] ?? '-'}</td>}
                        {premiumColumn && <td className="p-3 text-slate-300">{trade[premiumColumn] ?? '-'}</td>}
                        {entryTypeColumn && <td className="p-3 text-slate-300">{trade[entryTypeColumn] || '-'}</td>}
                        {ruleColumn && <td className="p-3 text-slate-300">{trade[ruleColumn] || '-'}</td>}
                        {zoneColumn && <td className="p-3 text-slate-300">{trade[zoneColumn] || '-'}</td>}
                        {patternColumn && <td className="p-3 text-slate-300">{trade[patternColumn] || '-'}</td>}
                        {entryUrlColumn && (
                          <td className="p-3">
                            {trade[entryUrlColumn] ? (
                              <a href={trade[entryUrlColumn]} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 text-xs underline">Link</a>
                            ) : <span className="text-slate-500 text-xs">-</span>}
                          </td>
                        )}
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            trade[statusColumn] === 'closed'
                              ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800'
                              : 'bg-blue-900/40 text-blue-300 border border-blue-800'
                          }`}>
                            {(trade[statusColumn] || '').toString().toUpperCase()}
                          </span>
                        </td>
                        <td className={`p-3 font-semibold ${parseFloat(trade[pnlColumn]) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {trade[pnlColumn] !== null && trade[pnlColumn] !== undefined ? `$${parseFloat(trade[pnlColumn]).toFixed(2)}` : '-'}
                        </td>
                        {notesColumn && <td className="p-3 text-slate-300">{trade[notesColumn] || '-'}</td>}
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

const MissedTradesAnalytics = ({ missed, config }) => {
  const { missedColumns, missedAnalyticsLabels } = config
  if (!missed.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4 text-slate-100">Missed Trades Analytics</h2>
        <p className="text-slate-400">Log a few missed opportunities to unlock analytics.</p>
      </div>
    )
  }

  const toNumber = (v) => (v === null || v === undefined || v === '') ? 0 : parseFloat(v)
  const sumPct = missed.reduce((s, r) => s + toNumber(r[missedColumns.potential]), 0)
  const avgPct = missed.length ? sumPct / missed.length : 0

  const groupBy = (field) => missed.reduce((acc, row) => {
    const key = row[field]
    if (!key) return acc
    if (!acc[key]) acc[key] = { count: 0, totalPct: 0 }
    acc[key].count++
    acc[key].totalPct += toNumber(row[missedColumns.potential])
    return acc
  }, {})

  const byDay = missed.reduce((acc, row) => {
    const created = row[missedColumns.createdAt]
    if (!created) return acc
    const day = new Date(created).toLocaleDateString(undefined, { weekday: 'long' })
    if (!acc[day]) acc[day] = { count: 0, totalPct: 0 }
    acc[day].count++
    acc[day].totalPct += toNumber(row[missedColumns.potential])
    return acc
  }, {})
  const byInstrument = groupBy(missedColumns.instrument)
  const byPattern = groupBy(missedColumns.pattern)

  const StatCard = ({ title, stats, suffix = 'misses' }) => (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3 text-slate-100">{title}</h3>
      <div className="space-y-2">
        {Object.entries(stats)
          .sort((a, b) => b[1].totalPct - a[1].totalPct)
          .slice(0, 5)
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
        <StatCard
          title={missedAnalyticsLabels.day}
          stats={Object.fromEntries(Object.entries(byDay).filter(([key]) => key && key !== 'Invalid Date'))}
        />
        <StatCard title={missedAnalyticsLabels.instrument} stats={byInstrument} suffix="misses" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatCard title={missedAnalyticsLabels.pattern} stats={byPattern} />
      </div>
    </div>
  )
}

const MissedTradeView = ({ setCurrentView, config }) => {
  const { tables, missedColumns, labels, missedPatternOptions } = config
  const missedTable = tables.missed

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    instrument: '',
    direction: 'long',
    beforeUrl: '',
    pattern: '',
    afterUrl: '',
    potential: ''
  })

  const handleInput = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    try {
      const payload = {
        [missedColumns.instrument]: config.uppercaseInstrument ? form.instrument.toUpperCase() : form.instrument,
        [missedColumns.direction]: form.direction,
        [missedColumns.beforeUrl]: form.beforeUrl || null,
        [missedColumns.pattern]: form.pattern || null,
        [missedColumns.afterUrl]: form.afterUrl || null,
        [missedColumns.potential]: form.potential === '' ? null : parseFloat(form.potential)
      }
      const { error } = await supabase.from(missedTable).insert([payload])
      if (error) throw error
      setMessage('Missed trade logged!')
      setForm({ instrument: '', direction: 'long', beforeUrl: '', pattern: '', afterUrl: '', potential: '' })
    } catch (err) { setMessage(`Error: ${err.message}`) }
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors">← Back to Menu</button>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{labels.missedTradeButton}</h1>
        {message && <div className={`p-4 rounded-lg mb-6 border ${message.startsWith('Error') ? 'bg-red-900/20 text-red-300 border-red-800' : 'bg-emerald-900/20 text-emerald-300 border-emerald-800'}`}>{message}</div>}
        <form onSubmit={handleSubmit} className="space-y-6 bg-slate-800 border border-slate-700 p-6 rounded-lg">
          <InputField label={labels.instrument} value={form.instrument} onChange={(e) => handleInput('instrument', e.target.value)} placeholder={labels.instrumentPlaceholder} required />
          <SelectField label="Direction" value={form.direction} onChange={(e) => handleInput('direction', e.target.value)} options={LONG_SHORT_OPTIONS} required />
          <InputField label="Before Trade Chart/Notes (Optional)" type="url" value={form.beforeUrl} onChange={(e) => handleInput('beforeUrl', e.target.value)} placeholder="https://tradingview.com/chart/..." />
          <SelectField label={labels.missedPattern} value={form.pattern} onChange={(e) => handleInput('pattern', e.target.value)} options={missedPatternOptions} />
          <InputField label="After Trade Review (Optional)" type="url" value={form.afterUrl} onChange={(e) => handleInput('afterUrl', e.target.value)} placeholder="https://tradingview.com/chart/..." />
          <InputField label="Potential Return (%)" type="number" step="0.01" value={form.potential} onChange={(e) => handleInput('potential', e.target.value)} placeholder="e.g., 2.5 for +2.5" />
          <button type="submit" disabled={isSubmitting} className="w-full p-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white rounded-lg font-semibold transition-colors">
            {isSubmitting ? 'Logging...' : 'Log Missed Trade'}
          </button>
        </form>
      </div>
    </div>
  )
}

const ViewMissedTrades = ({ setCurrentView, config }) => {
  const { tables, missedColumns, labels, missedAnalyticsLabels } = config
  const missedTable = tables.missed

  const [missed, setMissed] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.from(missedTable).select('*').order(missedColumns.createdAt, { ascending: false })
        if (error) throw error
        setMissed(data || [])
      } catch (err) {
        console.error('Error loading missed trades:', err.message)
      }
      setLoading(false)
    }
    load()
  }, [missedTable, missedColumns.createdAt])

  const toNumber = (v) => (v === null || v === undefined || v === '') ? 0 : parseFloat(v)
  const totalPct = missed.reduce((s, r) => s + toNumber(r[missedColumns.potential]), 0)
  const avgPct = missed.length ? (totalPct / missed.length) : 0

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 p-8">
      <button onClick={() => setCurrentView('menu')} className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors">← Back to Menu</button>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">{labels.missedDataButton}</h1>

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

        {activeTab === 'analytics' && <MissedTradesAnalytics missed={missed} config={config} />}

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
                      <th className="p-3 text-left text-slate-300">{labels.missedTableInstrument}</th>
                      <th className="p-3 text-left text-slate-300">Direction</th>
                      <th className="p-3 text-left text-slate-300">{labels.missedTablePattern}</th>
                      <th className="p-3 text-left text-slate-300">Before Link</th>
                      <th className="p-3 text-left text-slate-300">After Link</th>
                      <th className="p-3 text-left text-slate-300">Potential Return (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missed.map((row, idx) => (
                      <tr key={row[missedColumns.id] || idx} className={idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'}>
                        <td className="p-3 text-sm text-slate-300">{row[missedColumns.createdAt] ? new Date(row[missedColumns.createdAt]).toLocaleDateString() : '-'}</td>
                        <td className="p-3 font-semibold text-slate-100">{row[missedColumns.instrument]}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${row[missedColumns.direction] === 'long' ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800' : 'bg-red-900/40 text-red-300 border border-red-800'}`}>
                            {(row[missedColumns.direction] || '').toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">{row[missedColumns.pattern] || '-'}</td>
                        <td className="p-3">{row[missedColumns.beforeUrl] ? <a href={row[missedColumns.beforeUrl]} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 text-xs underline">Before</a> : <span className="text-slate-500 text-xs">-</span>}</td>
                        <td className="p-3">{row[missedColumns.afterUrl] ? <a href={row[missedColumns.afterUrl]} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs underline">After</a> : <span className="text-slate-500 text-xs">-</span>}</td>
                        <td className="p-3">{(row[missedColumns.potential] !== null && row[missedColumns.potential] !== undefined && row[missedColumns.potential] !== '') ? (
                          <span className={`${row[missedColumns.potential] >= 0 ? 'text-emerald-400' : 'text-red-400'} font-semibold`}>{parseFloat(row[missedColumns.potential]).toFixed(2)}%</span>
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

const NewTradeView = ({ setCurrentView, formData, setFormData, isSubmitting, setIsSubmitting, message, setMessage, config }) => {
  const {
    tables,
    tradeColumns,
    labels,
    entryTypeOptions,
    ruleOptions,
    zoneOptions,
    patternOptions,
    stopSizeStep,
    riskFraction,
    classes,
    accounts = []
  } = config
  const tradesTable = tables.trades
  const balanceTable = tables.balance
  const balanceColumns = config.balanceColumns
  const accountField = tradeColumns.account
  const hasMultipleAccounts = accounts.length > 0 && balanceColumns.currency

  const [currentBalance, setCurrentBalance] = useState(0)
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [accountBalances, setAccountBalances] = useState({})

  useEffect(() => {
    if (hasMultipleAccounts && !formData.account && accounts[0]?.value) {
      setFormData(prev => ({ ...prev, account: accounts[0].value }))
    }
  }, [accounts, formData.account, hasMultipleAccounts, setFormData])

  useEffect(() => {
    const loadBalances = async () => {
      setBalanceLoading(true)
      try {
        const { data, error } = await supabase
          .from(balanceTable)
          .select('*')
          .order(balanceColumns.createdAt, { ascending: false })

        if (error) throw error
        const history = data || []

        if (hasMultipleAccounts) {
          const balances = accounts.reduce((acc, account) => {
            const latest = history.find(entry => entry[balanceColumns.currency] === account.value)
            acc[account.value] = latest ? parseFloat(latest[balanceColumns.balance]) || 0 : 0
            return acc
          }, {})
          setAccountBalances(balances)
          const selected = formData.account || accounts[0]?.value
          setCurrentBalance(selected ? balances[selected] || 0 : 0)
        } else {
          const latest = history[0]
          setCurrentBalance(latest ? parseFloat(latest[balanceColumns.balance]) || 0 : 0)
        }
      } catch (err) {
        console.error('Error loading balance:', err.message)
      }
      setBalanceLoading(false)
    }
    loadBalances()
  }, [accounts, balanceColumns.balance, balanceColumns.createdAt, balanceColumns.currency, balanceTable, formData.account, hasMultipleAccounts])

  useEffect(() => {
    if (!hasMultipleAccounts) return
    const selected = formData.account || accounts[0]?.value
    if (!selected) return
    setCurrentBalance(accountBalances[selected] || 0)
  }, [accounts, accountBalances, formData.account, hasMultipleAccounts])

  const maxRisk = currentBalance * (riskFraction || 0)
  const riskAmount = parseFloat(formData.riskAmount) || 0
  const exceedsLimit = tradeColumns.riskAmount ? riskAmount > maxRisk : false
  const selectedAccountValue = formData.account || accounts[0]?.value || ''
  const selectedAccountLabel = accounts.find(account => account.value === selectedAccountValue)?.label

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    try {
      const payload = {}
      const assignValue = (column, value) => {
        if (!column) return
        payload[column] = value
      }

      assignValue(tradeColumns.instrument, config.uppercaseInstrument ? formData.instrument.toUpperCase() : formData.instrument)
      assignValue(tradeColumns.direction, formData.direction || null)
      assignValue(tradeColumns.optionType, formData.optionType || null)
      assignValue(tradeColumns.stopSize, formData.stopSize === '' ? null : (formData.stopSize ? parseFloat(formData.stopSize) : null))
      assignValue(tradeColumns.strike, formData.strike === '' ? null : (formData.strike ? parseFloat(formData.strike) : null))
      assignValue(tradeColumns.expiry, formData.expiry || null)
      assignValue(tradeColumns.contracts, formData.contracts === '' ? null : (formData.contracts ? parseFloat(formData.contracts) : null))
      assignValue(tradeColumns.premium, formData.premium === '' ? null : (formData.premium ? parseFloat(formData.premium) : null))
      assignValue(tradeColumns.riskAmount, formData.riskAmount === '' ? null : (formData.riskAmount ? parseFloat(formData.riskAmount) : null))
      assignValue(tradeColumns.entryUrl, formData.entryUrl || null)
      assignValue(tradeColumns.entryType, formData.entryType || null)
      assignValue(tradeColumns.rule, formData.rule || null)
      assignValue(tradeColumns.zone, formData.zone || null)
      assignValue(tradeColumns.pattern, formData.pattern || null)
      assignValue(tradeColumns.notes, formData.notes || null)
      assignValue(tradeColumns.status, 'open')
      assignValue(accountField, formData.account || accounts[0]?.value || null)

      const { error } = await supabase
        .from(tradesTable)
        .insert([payload])

      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage('Trade added successfully!')
        setFormData({ ...config.formDefaults })
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
        <div className="flex justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold whitespace-nowrap">{labels.newTradeTitle}</h1>
          <div className="shrink-0">
            {balanceLoading ? (
              <div className="text-slate-400">Loading balance...</div>
            ) : (
              <div className="bg-slate-800 border border-slate-700 p-5 md:p-6 rounded-lg w-fit min-w-[22rem] md:min-w-[28rem] text-left">
                <div className="text-base">
                  <span className="text-slate-400">{labels.balanceHeroLabel}</span>
                  {hasMultipleAccounts && selectedAccountLabel && (
                    <span className="ml-2 text-xs text-slate-500">({selectedAccountLabel})</span>
                  )}
                  <span className="ml-2 text-slate-100 font-semibold">${currentBalance.toFixed(2)}</span>
                </div>
                <div className="mt-2 flex items-center justify-start text-left text-xs md:text-sm text-slate-300 whitespace-nowrap">
                  <span>0.25% Risk: <span className="text-emerald-400 font-semibold">${(currentBalance * 0.0025).toFixed(2)}</span></span>
                  <span className="mx-2 text-slate-600">|</span>
                  <span>0.5% Risk: <span className="text-emerald-400 font-semibold">${(currentBalance * 0.005).toFixed(2)}</span></span>
                  <span className="mx-2 text-slate-600">|</span>
                  <span>1% Risk: <span className="text-emerald-400 font-semibold">${(currentBalance * 0.01).toFixed(2)}</span></span>
                </div>
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
          {accountField && accounts.length > 0 && (
            <SelectField
              label={labels.accountLabel}
              value={formData.account || accounts[0]?.value || ''}
              onChange={(e) => handleInputChange('account', e.target.value)}
              options={accounts}
              required
            />
          )}
          <InputField label={labels.instrument} value={formData.instrument} onChange={(e) => handleInputChange('instrument', e.target.value)} placeholder={labels.instrumentPlaceholder} required />

          {tradeColumns.optionType && config.optionTypeOptions && (
            <SelectField
              label={labels.optionTypeLabel || 'Option Type'}
              value={formData.optionType}
              onChange={(e) => handleInputChange('optionType', e.target.value)}
              options={config.optionTypeOptions}
              required
            />
          )}

          {tradeColumns.direction && (
            <SelectField
              label={labels.directionLabel || 'Direction'}
              value={formData.direction}
              onChange={(e) => handleInputChange('direction', e.target.value)}
              options={config.directionOptions || LONG_SHORT_OPTIONS}
              required
            />
          )}

          {tradeColumns.stopSize && labels.stopSizeLabel && (
            <InputField label={labels.stopSizeLabel} type="number" step={stopSizeStep || '0.01'} value={formData.stopSize} onChange={(e) => handleInputChange('stopSize', e.target.value)} placeholder="e.g., 0.50" />
          )}

          {tradeColumns.strike && (
            <InputField label={labels.strikeLabel || 'Strike Price ($)'} type="number" step="0.01" value={formData.strike} onChange={(e) => handleInputChange('strike', e.target.value)} placeholder="e.g., 175.50" />
          )}

          {tradeColumns.expiry && (
            <InputField label={labels.expiryLabel || 'Expiration Date'} type="date" value={formData.expiry} onChange={(e) => handleInputChange('expiry', e.target.value)} />
          )}

          {tradeColumns.contracts && (
            <InputField label={labels.contractsLabel || 'Contracts'} type="number" step="1" value={formData.contracts} onChange={(e) => handleInputChange('contracts', e.target.value)} placeholder="e.g., 3" />
          )}

          {tradeColumns.premium && (
            <InputField label={labels.premiumLabel || 'Premium ($)'} type="number" step="0.01" value={formData.premium} onChange={(e) => handleInputChange('premium', e.target.value)} placeholder="e.g., 2.45" />
          )}

          {tradeColumns.riskAmount && (
            <div className="mb-4">
              <InputField label="Risk Amount ($)" type="number" step="0.01" value={formData.riskAmount} onChange={(e) => handleInputChange('riskAmount', e.target.value)} placeholder={`Max: ${maxRisk.toFixed(2)}`} required />
              {formData.riskAmount && (
                <div className={`mt-2 p-2 rounded text-sm ${exceedsLimit ? 'bg-red-900/20 text-red-300 border border-red-800' : 'bg-emerald-900/20 text-emerald-300 border border-emerald-800'}`}>
                  {exceedsLimit ? `Risk exceeds ${(riskFraction * 100).toFixed(1)}% limit (${maxRisk.toFixed(2)})` : `Risk within limit (${currentBalance > 0 ? ((riskAmount / currentBalance) * 100).toFixed(2) : '0.00'}% of balance)`}
                </div>
              )}
            </div>
          )}

          {tradeColumns.entryType && entryTypeOptions && (
            <SelectField label="Entry Type" value={formData.entryType} onChange={(e) => handleInputChange('entryType', e.target.value)} options={entryTypeOptions} required />
          )}

          {tradeColumns.rule && ruleOptions && (
            <SelectField label="Market Context" value={formData.rule} onChange={(e) => handleInputChange('rule', e.target.value)} options={ruleOptions} required />
          )}

          {tradeColumns.zone && zoneOptions && (
            <SelectField label="Zone" value={formData.zone} onChange={(e) => handleInputChange('zone', e.target.value)} options={zoneOptions} required />
          )}

          {tradeColumns.pattern && patternOptions && (
            <SelectField label={labels.pattern} value={formData.pattern} onChange={(e) => handleInputChange('pattern', e.target.value)} options={patternOptions} required />
          )}

          {tradeColumns.entryUrl && (
            <InputField label={labels.entryUrlLabel || 'Chart / Notes URL'} type="url" value={formData.entryUrl} onChange={(e) => handleInputChange('entryUrl', e.target.value)} placeholder="https://tradingview.com/chart/..." />
          )}

          {tradeColumns.notes && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-slate-300">{labels.notesLabel || 'Notes'}</label>
              <textarea value={formData.notes} onChange={(e) => handleInputChange('notes', e.target.value)} placeholder="Trade setup, reasons, strategy..." rows="4" className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400" />
            </div>
          )}

          <button type="submit" disabled={isSubmitting || exceedsLimit} className={`w-full p-4 rounded-lg font-semibold transition-colors ${isSubmitting || exceedsLimit ? 'bg-slate-600 text-white cursor-not-allowed' : classes.primaryAction}`}>
            {exceedsLimit ? `Risk Exceeds ${(riskFraction * 100).toFixed(1)}% Limit` : isSubmitting ? 'Adding Trade...' : 'Add Trade'}
          </button>
        </form>
      </div>
    </div>
  )
}

const TradingPlanView = ({ setCurrentView, config }) => {
  const { tables, planColumns, labels } = config
  const planTable = tables.plan

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
          .from(planTable)
          .select('*')
          .order(planColumns.updatedAt, { ascending: false })
          .limit(1)

        if (error) throw error
        if (data && data.length > 0) {
          setContent(data[0][planColumns.content] || '')
          setLastUpdated(data[0][planColumns.updatedAt])
          setPlanId(data[0][planColumns.id])
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
  }, [planTable, planColumns.content, planColumns.updatedAt, planColumns.id])

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      if (planId) {
        const { error, data } = await supabase
          .from(planTable)
          .update({ [planColumns.content]: content })
          .eq(planColumns.id, planId)
          .select()
          .limit(1)
        if (error) throw error
        const row = data?.[0]
        setLastUpdated(row?.[planColumns.updatedAt] || new Date().toISOString())
        setMessage(`${labels.planTitle} saved!`)
      } else {
        const { error, data } = await supabase
          .from(planTable)
          .insert([{ [planColumns.content]: content }])
          .select()
          .limit(1)
        if (error) throw error
        const row = data?.[0]
        setPlanId(row?.[planColumns.id] || null)
        setLastUpdated(row?.[planColumns.updatedAt] || new Date().toISOString())
        setMessage(`${labels.planTitle} created!`)
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
          <h1 className="text-3xl font-bold">{labels.planTitle}</h1>
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
            <div className="text-slate-400">Loading...</div>
          ) : (
            <>
              <label className="block text-sm font-medium mb-2 text-slate-300">Document your strategy, criteria, risk rules, and review checklist here.</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Outline your strategy, criteria, risk management, and review routine..."
                rows={18}
                className="w-full p-4 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-500"
              />
              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-slate-500">Tip: Keep this updated as your playbook evolves.</div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
                >
                  {saving ? 'Saving...' : labels.planSave}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const TradingEnvironment = ({ config, onBack }) => {
  const [currentView, setCurrentView] = useState('menu')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({ ...config.formDefaults })
  const features = config.features || {}
  const supportsMissedTrades = features.missedTrades && config.tables?.missed
  const supportsTradingPlan = features.tradingPlan !== false && config.tables?.plan

  useEffect(() => {
    setCurrentView('menu')
    setMessage('')
    setIsSubmitting(false)
    setFormData({ ...config.formDefaults })
  }, [config])

  if (currentView === 'menu') {
    return (
      <div className="min-h-screen bg-gray-950 text-slate-100 flex items-center justify-center">
        <div className="w-full max-w-5xl px-4 py-10 md:py-16">
          <div className="flex justify-between items-center mb-8">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors"
            >
              {config.labels.menuBack}
            </button>
            <div className="text-right">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-100">{config.environmentTitle}</h1>
              <p className="text-slate-400 text-sm md:text-base mt-2">{config.environmentDescription}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <MenuButton onClick={() => setCurrentView('new-trade')} className={config.classes.primaryButton}>{config.labels.newTradeButton}</MenuButton>
              <MenuButton onClick={() => setCurrentView('update-trade')} className={config.classes.primaryButton}>{config.labels.updateTradeButton}</MenuButton>
              <MenuButton onClick={() => setCurrentView('view-data')} className={config.classes.primaryButton}>{config.labels.viewDataButton}</MenuButton>
            </div>
            {(supportsMissedTrades || supportsTradingPlan) && (
              <div className="space-y-4">
                {supportsMissedTrades && config.labels.missedTradeButton && (
                  <MenuButton onClick={() => setCurrentView('missed-trade')} className={config.classes.primaryButton}>{config.labels.missedTradeButton}</MenuButton>
                )}
                {supportsMissedTrades && config.labels.missedDataButton && (
                  <MenuButton onClick={() => setCurrentView('missed-data')} className={config.classes.primaryButton}>{config.labels.missedDataButton}</MenuButton>
                )}
                {supportsTradingPlan && (
                  <MenuButton onClick={() => setCurrentView('trading-plan')} className={config.classes.primaryButton}>{config.labels.tradingPlanButton}</MenuButton>
                )}
              </div>
            )}
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
        config={config}
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
        config={config}
      />
    )
  }

  if (currentView === 'view-data') return <ViewHistoricalData setCurrentView={setCurrentView} config={config} />
  if (currentView === 'missed-trade' && supportsMissedTrades) return <MissedTradeView setCurrentView={setCurrentView} config={config} />
  if (currentView === 'missed-data' && supportsMissedTrades) return <ViewMissedTrades setCurrentView={setCurrentView} config={config} />
  if (currentView === 'trading-plan' && supportsTradingPlan) return <TradingPlanView setCurrentView={setCurrentView} config={config} />
  return null
}

export default function Home() {
  const [activeMode, setActiveMode] = useState(null)

  if (!activeMode) {
    return (
      <div className="min-h-screen bg-gray-950 text-slate-100 flex items-center justify-center">
        <div className="w-full max-w-4xl px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-100 mb-4">Choose Your Trading Workspace</h1>
          <p className="text-slate-400 mb-10 text-lg">Jump into dedicated workspaces for stocks, forex, or options and keep every playbook, trade, and review in one place.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center flex-wrap">
            <MenuButton onClick={() => setActiveMode('stocks')} className={MODE_CONFIG.stocks.classes.primaryButton}>
              {MODE_CONFIG.stocks.homeButtonLabel}
            </MenuButton>
            <MenuButton onClick={() => setActiveMode('forex')} className={MODE_CONFIG.forex.classes.primaryButton}>
              {MODE_CONFIG.forex.homeButtonLabel}
            </MenuButton>
            <MenuButton onClick={() => setActiveMode('options')} className={MODE_CONFIG.options.classes.primaryButton}>
              {MODE_CONFIG.options.homeButtonLabel}
            </MenuButton>
          </div>
        </div>
      </div>
    )
  }

  return <TradingEnvironment config={MODE_CONFIG[activeMode]} onBack={() => setActiveMode(null)} />
}
