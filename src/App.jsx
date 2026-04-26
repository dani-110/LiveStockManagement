import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import { FaUsers, FaPlus, FaSignOutAlt, FaChevronLeft, FaChevronRight, FaClipboardList, FaCashRegister } from 'react-icons/fa';
import { FaFilePdf, FaPrint, FaMoneyBillWave, FaCalendarAlt, FaUser } from 'react-icons/fa';
import './App.css';
import { block, bookingType, expenseType, users } from './utils';
import { FaCow } from 'react-icons/fa6';

const App = () => {
  const [panel, setPanel] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState('');
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expenseDetail, setExpenseDetail] = useState({
    totalEarning: 0,
    totalExpense: 0,
    amountInHand: 0,
    count: 0,
  });
  const [showMForm, setShowMForm] = useState(false);
  const [showEForm, setShowEForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginCreds, setLoginCreds] = useState({ username: '', password: '' });
  const [pageSize, setPageSize] = useState(10);
  const [type, setType] = useState('');
  const [pageInfo, setPageInfo] = useState({
    totalRecords: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 10,
    hasNextPage: false,
    hasPreviousPage: false
  });
  const [expensePageInfo, setExpensePageInfo] = useState({
    totalRecords: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 10,
    hasNextPage: false,
    hasPreviousPage: false
  });

  const [filters, setFilters] = useState({
    userId: '', // Empty means 'All'
    cnic: '',
    dateFrom: '',
    dateTo: '' // Today's date
  });
  const [expenseFilters, setExpenseFilters] = useState({
    type: '',
  });

  const [reportData, setReportData] = useState(null);
  const reportRef = useRef();
  const [analyticsData, setAnalyticsData] = useState(null);

  const reportsTableRef = useRef();
  const expenseTableRef = useRef();

  const API = axios.create({
    baseURL: "https://nkcm.nexoriasystems.com/api"
  });

  API.interceptors.request.use((config) => {
    const token = localStorage.getItem('lv_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  useEffect(() => {
    const utcNow = new Date().toISOString();
    console.log(utcNow);
    const token = localStorage.getItem('lv_token');
    if (token) {
      setIsLoggedIn(true);
      setPanel('main');
      fetchMembers(1);
      setUser(localStorage.getItem('lv_user'));
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await API.post("/auth/login", loginCreds);
      if (response.data.token) {
        localStorage.setItem('lv_token', response.data.token);
        console.log(response.data)
        localStorage.setItem('lv_user', response.data.username || loginCreds.username);
        setUser(response.data.username || loginCreds.username);
        setIsLoggedIn(true);
        setPanel('main');
        fetchMembers(1);
      }
    } catch (error) {
      alert(error.response?.data?.message || "Login failed!");
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    console.log(filters.dateFrom)
    setLoading(true);
    try {
      const res = await API.get(`/members/report`, {
        params: {
          userId: filters.userId,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          cnic: filters.cnic,
          bookingtype: filters.bookingtype,
        }
      });
      setAnalyticsData(res.data); // Yahan change kiya
    } catch (error) {
      console.error("Report fetch error", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (pageNumber = 1) => {
    try {
      const response = await API.get(`/members`, {
        params: { pageNumber, pageSize }
      });
      const { data, ...rest } = response.data;
      setMembers(data);
      setPageInfo(rest);
    } catch (error) {
      if (error.response?.status === 401) handleLogout();
    }
  };

  const fetchExpenses = async () => {
    try {
      const response = await API.get(`/expense`);
      const { data, ...rest } = response.data;
      console.log(rest)
      setExpenses(data);
      setExpenseDetail({
        totalEarning: rest?.totalEarning,
        totalExpense: rest?.totalExpense,
        amountInHand: rest?.amountInHand,
        count: rest?.count,
      })
    } catch (error) {
      if (error.response?.status === 401) handleLogout();
    }
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const user = await localStorage.getItem('lv_user');
    const payload = {
      fullname: formData.get('fullname') || '',
      fathername: formData.get('fathername') || '',
      cnic: formData.get('cnic') || '',
      Block: formData.get('Block') || '',
      BookingType: formData.get('BookingType') || '',
      patte: formData.get('patte') || '',
      cellno: formData.get('cellno') || '',
      amount: parseFloat(formData.get('amount')) || 0,
      cowQuantity: parseInt(formData.get('cowQuantity')) || 0,
      createdby: users?.find(val => val.name == user).value
    };
    console.log(user, payload)
    try {
      const res = await API.post("/members", payload);
      console.log(res);
      alert("Member saved!");
      const obj = {
        ...res.data?.data,
        createdByName: res.data.createdByName
      }
      setReportData(obj);
      setShowMForm(false);
      fetchMembers(pageInfo.currentPage);

    } catch (error) {
      handleLogout();
      alert("Your session is expired please re-login.");
    } finally {
      setLoading(false);
    }
  };
  const handleSaveExpenses = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const payload = {
      type: formData.get('type'),
      amount: parseFloat(formData.get('amount')) || 0,
      description: formData.get('description'),
    };
    try {
      const res = await API.post("/expense", payload);
      console.log(res?.data?.data);
      alert("Expense saved!");
      // const obj = {
      //   ...res.data?.data,
      //   createdByName: res.data.createdByName
      // }
      // setReportData(obj);
      setShowEForm(false);
      fetchExpenses();
    } catch (error) {
      handleLogout();
      alert("Your session is expired please re-login.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setPanel('login');
  };

  // Jab pageSize change ho tw pehle page se fetch kro
  useEffect(() => {
    if (isLoggedIn) fetchMembers(1);
  }, [pageSize]);

  useEffect(() => {
    if (panel === 'reports') {
      fetchReport();
    }
    if (panel === 'expenses') {
      fetchExpenses();
    }
  }, [filters, panel]);

  // 2. Download PDF Logic
  const downloadPDF = () => {
    const element = reportRef.current;
    const opt = {
      margin: 10,
      filename: `Report-${reportData.sno}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  // 3. Print Logic
  const handlePrint = () => {
    window.print();
  };


  const downloadTablePDF = () => {
    const element = reportsTableRef.current;
    const opt = {
      margin: [10, 5, 10, 5], // Top, Left, Bottom, Right
      filename: `Reports-Summary-${new Date().toLocaleDateString()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } // Landscape behtar hai table ke liye
    };
    html2pdf().set(opt).from(element).save();
  };


  // Generic Print Function
  const handleTablePrint = () => {
    const printContents = reportsTableRef.current.innerHTML;
    const originalContents = document.body.innerHTML;
    console.log(printContents)

    // Print ke waqt sirf table dikhane ke liye body ko replace karte hain
    document.body.innerHTML = `
    <html>
      <head>
        <title>Print Report</title>
        <style>
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10pt; }
          th { background-color: #f2f2f2; }
          h1, p { text-align: center; font-family: sans-serif; }
          .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            text-align: center;
            font-size: 10px;
            color: #555;
          }
          .user-tag { background: #eee; padding: 2px 5px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <h1>New Karachi Maweshi Mandi - Reports</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        ${printContents}
        <div class="footer">
         <p>Car Bazar, Sector 11-D, New Karachi, Karachi</p>
         Powered By 4P Technologies
         </div>
      </body>
    </html>
  `;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); // State wapas lane ke liye reload zaroori hai is method mein
  };

  const downloadExpenseTablePDF = () => {
    const element = expenseTableRef.current;
    const opt = {
      margin: [10, 5, 10, 5], // Top, Left, Bottom, Right
      filename: `Expense-Summary-${new Date().toLocaleDateString()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } // Landscape behtar hai table ke liye
    };
    html2pdf().set(opt).from(element).save();
  };


  const handleExpenseTablePrint = () => {
    const printContents = expenseTableRef.current.innerHTML;
    const originalContents = document.body.innerHTML;
    console.log(printContents)

    // Print ke waqt sirf table dikhane ke liye body ko replace karte hain
    document.body.innerHTML = `
    <html>
      <head>
        <title>Print Report</title>
        <style>
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10pt; }
          th { background-color: #f2f2f2; }
          h1, p { text-align: center; font-family: sans-serif; margin: 10px 0px; }
          .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            text-align: center;
            font-size: 10px;
            color: #555;
          }
          .user-tag { background: #eee; padding: 2px 5px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <h1>New Karachi Maweshi Mandi - Expense Reports</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        ${printContents}
        <div class="footer">
         <p>Car Bazar, Sector 11-D, New Karachi, Karachi</p>
         Powered By 4P Technologies
         </div>
      </body>
    </html>
  `;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); // State wapas lane ke liye reload zaroori hai is method mein
  };

  return (
    <div className="livestock-app">
      <div className="topnav">
        <div className="brand">
          <div class="brand-icon">🐄</div>
          <div>
            <div className="brand-name">Livestock Management</div>
            <p style={{ color: 'gray', fontSize: '10px' }}>Record System</p>
          </div>
        </div>

        {/* TABS: Sirf tab dikhen jab user login ho */}
        {isLoggedIn && (
          <div className="nav-links">
            <button
              className={`nav-tab ${panel === 'main' ? 'active' : ''}`}
              onClick={() => setPanel('main')}
            >
              Main Window
            </button>
            <button
              className={`nav-tab ${panel === 'reports' ? 'active' : ''}`}
              onClick={() => setPanel('reports')}
            >
              Reports
            </button>
            {user?.includes('admin') && <button
              className={`nav-tab ${panel === 'expenses' ? 'active' : ''}`}
              onClick={() => setPanel('expenses')}
            >
              Expenses
            </button>}
          </div>
        )}

        {isLoggedIn && (
          <div className="user-chip">
            <span className="user-name">{user || localStorage.getItem('lv_user')}</span>
            <button className="logout-link" onClick={handleLogout}><FaSignOutAlt /> Logout</button>
          </div>
        )}
      </div>

      {panel === 'login' && (
        <div className="login-wrap">
          <form className="login-card" onSubmit={handleLogin}>
            <div style={{ textAlign: "center", marginBottom: "10px" }}>
              <div class="login-cow">🐄</div>
              <h2 style={{ marginBottom: "5px" }}>Welcome Back</h2>
              <p style={{ fontSize: '12px', fontWeight: "400" }}>Livestock Management System</p>
              <p style={{ fontSize: '12px', fontWeight: "400" }}>Login and continue ...</p>
            </div>
            <input className="login-input" type="text" placeholder="Username" required onChange={(e) => setLoginCreds({ ...loginCreds, username: e.target.value })} />
            <input className="login-input" type="password" placeholder="Password" required onChange={(e) => setLoginCreds({ ...loginCreds, password: e.target.value })} />
            <button type="submit" className="login-btn" disabled={loading}>{loading ? "Verifying..." : "Login"}</button>
          </form>
        </div>
      )}

      {panel === 'main' && (
        <div className="panel">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
              <div className="card-title"><FaUsers /> Members ({pageInfo.totalRecords})</div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="page-size-select">
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                </select>
                <button className="login-btn" onClick={() => setShowMForm(!showMForm)}><FaPlus /> Add Member</button>
              </div>
            </div>

            {showMForm && (
              <form className="form-section" onSubmit={handleSaveMember}>
                <div className="form-grid">
                  <div className="fg"><label>Full Name  (نام)</label><input name="fullname" required /></div>
                  <div className="fg"><label>Father Name  (والد کا نام)</label><input name="fathername" /></div>
                  <div className="fg">
                    <label>CNIC (Max 11 - 13)  (شناختی نمبر)</label>
                    <input name="cnic" type="number" onInput={(e) => e.target.value = e.target.value.slice(0, 13)} />
                  </div>

                  <div className="fg"><label>Cell No  (فون نمبر)</label><input name="cellno" type="number" /></div>
                  <div className="fg select-box "><label>Block  (بلاک)</label><select name="Block">
                    <option value="">Select Block</option>
                    {block.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  </div>
                  <div className="fg select-box "><label>Booking Type  (بکنگ کی قسم)</label><select
                    name="BookingType"
                    value={type}
                    onChange={(e) => {
                      console.log(e.target.value)
                      setType(e.target.value)
                    }}
                  >
                    <option value="">Select Type</option>
                    {bookingType.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.name}
                      </option>
                    ))}
                  </select></div>
                  <div className="fg"><label>Amount  (رقم)</label><input name="amount" type="number" min="0" /></div>
                  {type?.includes('Patte') && <div className="fg"><label>Patte NO.  (پٹی نمبر)</label><input name="patte" type="number" min="0" /></div>}
                  {(type == 'Cow' || type == 'Goat') && <div className="fg"><label>Quantity  (تعداد)</label><input name="cowQuantity" type="number" min="0" /></div>}
                </div>
                <button type="submit" className="btn-save" disabled={loading} style={{ marginTop: '10px' }}>
                  {loading ? "Saving..." : "Save Member"}
                </button>
              </form>
            )}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Name</th><th>S/O</th><th>CNIC</th><th>Block</th><th>Booking Type</th><th>Patte NO.</th><th>Quantity</th></tr>
                </thead>
                <tbody>
                  {members.length > 0 ? members.map((m, index) => (
                    <tr key={m.id || index}>
                      <td>{m.sno || (pageInfo.currentPage - 1) * pageSize + (index + 1)}</td>
                      <td>{m.fullname}</td>
                      <td>{m.fathername}</td>
                      <td>{m.cnic}</td>
                      <td>{m.block}</td>
                      <td>{m.bookingType == 'Patte Full' ? 'Patte' : m.bookingType}</td>
                      <td>{m.patte}</td>
                      <td>{m.cowQuantity}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" className="empty-row">No members found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination UI at Bottom */}
            <div className="pagination-footer">
              <div className="page-info">
                Showing {members.length} of {pageInfo.totalRecords} records
              </div>
              <div className="pagination-btns">
                <button
                  className="p-btn"
                  disabled={!pageInfo.hasPreviousPage}
                  onClick={() => fetchMembers(pageInfo.currentPage - 1)}
                >
                  <FaChevronLeft /> Previous
                </button>
                <span className="p-text">Page {pageInfo.currentPage} of {pageInfo.totalPages}</span>
                <button
                  className="p-btn"
                  disabled={!pageInfo.hasNextPage}
                  onClick={() => fetchMembers(pageInfo.currentPage + 1)}
                >
                  Next <FaChevronRight />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* SUCCESS MODAL / REPORT */}
      {reportData && (
        <div className="modal-overlay">
          <div className="modal-content">
            {/* Printable Area Start */}
            <div className="report-container" ref={reportRef} id="printable-area">
              <div className="report-header">
                <h2>New Karachi 11-D Maweshi Mandi</h2>
                <div className="sno-badge">SNO-{reportData.sno}</div>
              </div>

              <div className="report-body">
                <div className="booking-type"><strong>Booking Type:</strong> {reportData.bookingType == 'Patte Full' ? 'Patte' : reportData.bookingType}</div>
                <div className="report-row">
                  <div className="report-col"><strong>Full Name  (نام):</strong> <span>{reportData.fullname}</span></div>
                  <div className="report-col"><strong>Father Name  (والد کا نام):</strong> <span>{reportData.fathername}</span></div>
                </div>
                <div className="report-row">
                  <div className="report-col"><strong>CNIC  (شناختی نمبر):</strong> <span>{reportData.cnic}</span></div>
                  <div className="report-col"><strong>Cell No  (فون نمبر):</strong> <span>{reportData.cellno}</span></div>
                </div>
                <div className="report-row">
                  <div className="report-col"><strong>Block  (بلاک):</strong> <span>{reportData.block}</span></div>
                  {(reportData?.bookingType == 'Cow' || reportData?.bookingType == 'Goat') && <div className="report-col"><strong>Quantity  (تعداد):</strong> <span>{reportData.cowQuantity}</span></div>}
                  {reportData?.bookingType?.includes('Patte') && <div className="report-col"><strong>Patte No.  (پٹی نمبر):</strong> <span>{reportData?.patte}</span></div>}
                </div>
                <div className="report-row">
                  <div className="report-col"><strong>Amount  (رقم):</strong> <span>RS {reportData.amount?.toLocaleString()}</span></div>
                  <div className="report-col"><strong>Date  (تاریخ):</strong> <span>{new Date(reportData?.createdat).toLocaleString()}</span></div>
                </div>
                <div className="report-row">
                  <div className="report-col"><strong>Created By  (تیار کردہ از):</strong> <span>{reportData.createdByName}</span></div>
                </div>
              </div>
              <div className="report-footer">
                <p>Car Bazar, Sector 11-D, New Karachi, Karachi</p>
                <p>Powered by 4P Technologies</p>
              </div>
            </div>
            {/* Printable Area End */}

            <div className="modal-actions no-print">
              <button className="btn-print" onClick={handlePrint}>Print</button>
              <button className="btn-pdf" onClick={downloadPDF}>Download PDF</button>
              <button className="btn-close" onClick={() => setReportData(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {panel === 'reports' && (
        <div className="panel">
          {/* Header Section from Screenshot */}
          <div className="page-header">
            <div>
              <h1>Reports</h1>

              <div className="page-header-icon" style={{ display: "flex", justifyContent: "start", alignItems: 'center', gap: "10px", marginTop: "20px", marginBottom: "10px" }}>
                <p>Total records and analytics</p>
                <FaClipboardList />
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="filters-bar">
            <div className="filter-item">
              <label><FaUser /> User</label>
              <select
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              >
                <option value="">All Users</option>
                <option value="1">user1</option>
                <option value="5">user2</option>
                <option value="3">user3</option>
                <option value="4">user4</option>
                <option value="2">admin</option>
              </select>
            </div>
            <div className="filter-item">
              <label><FaCalendarAlt /> From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                max={filters.dateTo || undefined}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div className="filter-item">
              <label><FaCalendarAlt /> To Date</label>
              <input
                type="date"
                min={filters.dateFrom || undefined}
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="filter-item">
              <label><FaUser /> CNIC</label>
              <input
                type="number"
                value={filters.cnic}
                onChange={(e) => setFilters({ ...filters, cnic: e.target.value })}
                onInput={(e) => e.target.value = e.target.value.slice(0, 13)}
              />
            </div>
            <div className="filter-item">
              <label><FaUser /> Booking Type</label>
              <select
                value={filters.bookingtype}
                onChange={(e) => setFilters({ ...filters, bookingtype: e.target.value })}
              >
                <option value="">Select Type</option>
                {bookingType.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stat Cards Section */}
          <div className="stat-grid">
            {/* <div className="stat-card stat-card-1">
              <div className="stat-card-lbl">Total Transactions</div>
              <div className="stat-card-val">{reportData?.filteredCount}</div>
              <div className="stat-card-icon"><FaClipboardList /></div>
            </div> */}
            <div className="stat-card stat-card-2">
              <div className="stat-card-lbl">Total Amount (RS)</div>
              <div className="stat-card-val">{analyticsData?.globalTotalAmount?.toLocaleString()}</div>
              <div className="stat-card-icon"><FaMoneyBillWave /></div>
            </div>
            <div className="stat-card stat-card-3">
              <div className="stat-card-lbl">Total Cows</div>
              <div className="stat-card-val">{analyticsData?.globalTotalCows}</div>
              {/* <div className="stat-card-icon"><FaCow /></div> */}
              <div class="stat-card-icon">🐄</div>
            </div>
          </div>

          {/* Data Table Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
              <div className="card-title"><span>📂</span> All Records</div>
              <div className="action-bar">
                {/* <button className="btn-pdf"><FaFilePdf /> PDF</button> */}
                {/* <button className="btn-print"><FaPrint /> Print</button> */}

                <button className="btn-pdf" onClick={downloadTablePDF}><FaFilePdf /> PDF</button>
                &nbsp; &nbsp;
                <button className="btn-print" onClick={handleTablePrint}><FaPrint /> Print</button>
              </div>
            </div>
            <div className="table-wrap" ref={reportsTableRef}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Name</th>
                    <th>S/O</th>
                    <th>CNIC</th>
                    <th>Cell No</th>
                    <th>Block</th>
                    <th>Booking Type</th>
                    <th>Patte No</th>
                    <th>Quantity</th>
                    <th>RS</th>
                    <th>Created By</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" className="empty-row">Loading records...</td></tr>
                  ) : analyticsData?.data.length > 0 ? (
                    analyticsData?.data.map((item, index) => (
                      <tr key={item.id}>
                        <td>{item.sno}</td>
                        <td>{new Date(item.createdat).toLocaleString()}</td>
                        <td><b>{item.fullname}</b></td>
                        <td>{item.fathername}</td>
                        <td>{item.cnic}</td>
                        <td>{item.cellno}</td>
                        <td>{item.block}</td>
                        <td>{item.bookingType == 'Patte Full' ? 'Patte' : item.bookingType}</td>
                        <td>{item.patte}</td>
                        <td>{item.cowQuantity}</td>
                        <td>{item.amount.toLocaleString()}</td>
                        <td><span className="user-tag">{item.createdByName}</span></td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="8" className="empty-row">No records found for the selected filters</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {panel === 'expenses' && (
        <div className="panel">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
              <div className="card-title"><FaCashRegister /> Expenses ({expenseDetail?.count})</div>

              <div style={{ display: 'flex', gap: '10px' }}>

                <button className="login-btn" onClick={() => setShowEForm(!showEForm)}><FaPlus /> Add Expense</button>
              </div>
            </div>

            {showEForm && (
              <form className="form-section" onSubmit={handleSaveExpenses}>
                <div className="form-grid">
                  <div className="fg select-box "><label>Expense Type  (خرچ کی قسم)</label><select
                    name="type"
                    value={type}
                    onChange={(e) => {
                      console.log(e.target.value)
                      setType(e.target.value)
                    }}
                  >
                    <option value="">Select Type</option>
                    {expenseType.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  </div>
                  <div className="fg"><label>Amount  (رقم)</label><input name="amount" type="number" min="0" /></div>

                </div>
                <div className="fg" style={{ margin: '10px 0px' }}><label>Description  (تفصیل)</label><textarea className="form-textarea" rows="4" name="description" /></div>
                <button type="submitExpense" className="btn-save" disabled={loading} style={{ marginTop: '10px' }}>
                  {loading ? "Saving..." : "Save Expense"}
                </button>
              </form>
            )}

            <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="stat-card stat-card-1">
                <div className="stat-card-lbl">Total Earning (RS)</div>
                <div className="stat-card-val">{expenseDetail?.totalEarning?.toLocaleString()}</div>
                <div className="stat-card-icon"><FaMoneyBillWave /></div>
              </div>
              <div className="stat-card stat-card-3">
                <div className="stat-card-lbl">Total Expenses</div>
                <div className="stat-card-val">{expenseDetail?.totalExpense?.toLocaleString()}</div>
                <div className="stat-card-icon"><FaCashRegister /></div>
              </div>
              <div className="stat-card stat-card-2">
                <div className="stat-card-lbl">Amount In Hand</div>
                <div className="stat-card-val">{expenseDetail?.amountInHand?.toLocaleString()}</div>
                <div className="stat-card-icon"><FaMoneyBillWave /></div>
              </div>

            </div>

            <div className="filters-bar">

              <div className="filter-item">
                <label><FaUser /> Expense Type</label>
                <select
                  value={expenseFilters?.type}
                  onChange={(e) => setExpenseFilters({ ...expenseFilters, type: e.target.value })}
                >
                  <option value="">Select Type</option>
                  {expenseType?.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="action-bar">
                {/* <button className="btn-pdf"><FaFilePdf /> PDF</button> */}
                {/* <button className="btn-print"><FaPrint /> Print</button> */}

                <button className="btn-pdf" onClick={downloadExpenseTablePDF}><FaFilePdf /> PDF</button>
                &nbsp; &nbsp;
                <button className="btn-print" onClick={handleExpenseTablePrint}><FaPrint /> Print</button>
              </div>
            </div>

            <div className="table-wrap" ref={expenseTableRef}>
              <table>
                <thead>
                  <tr><th>#</th><th>Expense Type</th><th>Amount</th><th>Description</th></tr>
                </thead>
                <tbody>
                  {expenses.length > 0 ? (expenseFilters?.type
                    ? expenses?.filter(val => val.type === expenseFilters.type)
                    : expenses
                  )?.map((m, index) => (
                    <tr key={m.id || index}>
                      <td>{m?.sno || ''}</td>
                      <td>{m?.type}</td>
                      <td>{m?.amount?.toLocaleString()}</td>
                      <td>{m?.description}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" className="empty-row">No expenses found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination UI at Bottom */}

          </div>
        </div>
      )}
    </div>
  );
};

export default App;