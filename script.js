const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "bookBankManagementData";

function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
    } catch (error) {
        console.error("Could not load saved data:", error);
    }

    return {
        books: [
            { id: 1, title: "Data Structures", author: "Seymour Lipschutz", category: "Technology", total: 5 },
            { id: 2, title: "Clean Code", author: "Robert C. Martin", category: "Education", total: 4 },
            { id: 3, title: "Java Programming", author: "Herbert Schildt", category: "Technology", total: 3 },
            { id: 4, title: "Physics Fundamentals", author: "H. C. Verma", category: "Science", total: 6 }
        ],
        members: [
            { id: 1, name: "Aarav Sharma", studentId: "STU001", email: "aarav@example.com", department: "CSE" },
            { id: 2, name: "Sneha Reddy", studentId: "STU002", email: "sneha@example.com", department: "ECE" },
            { id: 3, name: "Rohit Kumar", studentId: "STU003", email: "rohit@example.com", department: "CSE" }
        ],
        transactions: [],
        nextBookId: 5,
        nextMemberId: 4,
        nextTransactionId: 1
    };
}

let data = loadData();

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        alert("Could not save data. Check your browser storage settings.");
    }
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function today() {
    const date = new Date();
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
}

function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}

// SIDEBAR: show only one section at a time
function showPage(pageId) {
    if (!$ (pageId)) return;

    document.querySelectorAll(".page").forEach(page => {
        page.classList.toggle("active", page.id === pageId);
    });

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle("active", link.dataset.page === pageId);
    });

    $("sidebar").classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });

    renderAll();
}

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => showPage(link.dataset.page));
});

$("menuBtn").addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
});

$("currentDate").textContent = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
});

// HELPERS
function getBook(id) {
    return data.books.find(book => book.id === Number(id));
}

function getMember(id) {
    return data.members.find(member => member.id === Number(id));
}

function availableCopies(book) {
    const issued = data.transactions.filter(transaction =>
        transaction.bookId === book.id && transaction.status === "Issued"
    ).length;

    return book.total - issued;
}

function statusHTML(transaction) {
    if (transaction.status === "Returned") {
        return '<span class="status returned">Returned</span>';
    }

    if (transaction.dueDate < today()) {
        return '<span class="status overdue">Overdue</span>';
    }

    return '<span class="status issued">Issued</span>';
}

function emptyRow(columns, message) {
    return `<tr><td colspan="${columns}" class="empty">${escapeHTML(message)}</td></tr>`;
}

// DASHBOARD
function renderDashboard() {
    const total = data.books.reduce((sum, book) => sum + book.total, 0);
    const available = data.books.reduce((sum, book) => sum + availableCopies(book), 0);
    const issued = data.transactions.filter(t => t.status === "Issued").length;

    $("totalBooks").textContent = total;
    $("totalMembers").textContent = data.members.length;
    $("issuedBooks").textContent = issued;
    $("availableBooks").textContent = available;

    $("donutValue").textContent = total;
    $("legendAvailable").textContent = available;
    $("legendIssued").textContent = issued;

    const availablePercent = total ? (available / total) * 100 : 100;
    $("bookDonut").style.background =
        `conic-gradient(var(--blue) 0% ${availablePercent}%, var(--purple) ${availablePercent}% 100%)`;

    const recent = [...data.transactions]
        .sort((a, b) => b.id - a.id)
        .slice(0, 5);

    $("recentTransactions").innerHTML = recent.length
        ? recent.map(t => {
            const book = getBook(t.bookId);
            const member = getMember(t.memberId);

            return `<tr>
                <td>${escapeHTML(book?.title || "Deleted book")}</td>
                <td>${escapeHTML(member?.name || "Deleted member")}</td>
                <td>${escapeHTML(t.issueDate)}</td>
                <td>${escapeHTML(t.dueDate)}</td>
                <td>${statusHTML(t)}</td>
            </tr>`;
        }).join("")
        : emptyRow(5, "No transactions yet. Issue a book to get started.");
}

// BOOK MANAGEMENT
function renderBooks() {
    const query = $("bookSearch").value.toLowerCase().trim();

    const books = data.books.filter(book =>
        [book.title, book.author, book.category, book.id]
            .some(value => String(value).toLowerCase().includes(query))
    );

    $("booksTable").innerHTML = books.length
        ? books.map(book => `
            <tr>
                <td>BK${String(book.id).padStart(3, "0")}</td>
                <td>${escapeHTML(book.title)}</td>
                <td>${escapeHTML(book.author)}</td>
                <td>${escapeHTML(book.category)}</td>
                <td>${book.total}</td>
                <td>${availableCopies(book)}</td>
                <td>
                    <button class="action-btn danger" data-action="delete-book" data-id="${book.id}">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join("")
        : emptyRow(7, "No books found.");
}

$("bookForm").addEventListener("submit", event => {
    event.preventDefault();

    const title = $("bookTitle").value.trim();
    const author = $("bookAuthor").value.trim();
    const category = $("bookCategory").value;
    const copies = Number($("bookCopies").value);

    if (!title || !author || !Number.isInteger(copies) || copies < 1) {
        showToast("Enter valid book details.");
        return;
    }

    data.books.push({
        id: data.nextBookId++,
        title,
        author,
        category,
        total: copies
    });

    saveData();
    event.target.reset();
    $("bookCopies").value = 1;
    renderAll();
    showToast("Book added successfully!");
});

$("bookSearch").addEventListener("input", renderBooks);

// MEMBER MANAGEMENT
function renderMembers() {
    const query = $("memberSearch").value.toLowerCase().trim();

    const members = data.members.filter(member =>
        [member.name, member.studentId, member.email, member.department]
            .some(value => String(value).toLowerCase().includes(query))
    );

    $("membersTable").innerHTML = members.length
        ? members.map(member => `
            <tr>
                <td>MB${String(member.id).padStart(3, "0")}</td>
                <td>${escapeHTML(member.name)}</td>
                <td>${escapeHTML(member.studentId)}</td>
                <td>${escapeHTML(member.email || "—")}</td>
                <td>${escapeHTML(member.department)}</td>
                <td>
                    <button class="action-btn danger" data-action="delete-member" data-id="${member.id}">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join("")
        : emptyRow(6, "No members found.");
}

$("memberForm").addEventListener("submit", event => {
    event.preventDefault();

    const name = $("memberName").value.trim();
    const studentId = $("memberStudentId").value.trim();
    const email = $("memberEmail").value.trim();
    const department = $("memberDepartment").value.trim();

    if (!name || !studentId || !department) {
        showToast("Please complete all required fields.");
        return;
    }

    if (data.members.some(m => m.studentId.toLowerCase() === studentId.toLowerCase())) {
        showToast("This student ID is already registered.");
        return;
    }

    data.members.push({
        id: data.nextMemberId++,
        name,
        studentId,
        email,
        department
    });

    saveData();
    event.target.reset();
    renderAll();
    showToast("Member registered successfully!");
});

$("memberSearch").addEventListener("input", renderMembers);

// ISSUE BOOK
function renderIssueOptions() {
    const previousBook = $("issueBook").value;
    const previousMember = $("issueMember").value;

    const availableBooks = data.books.filter(book => availableCopies(book) > 0);

    $("issueBook").innerHTML = '<option value="">Select a book</option>' +
        availableBooks.map(book =>
            `<option value="${book.id}">${escapeHTML(book.title)} (${availableCopies(book)} available)</option>`
        ).join("");

    $("issueMember").innerHTML = '<option value="">Select a member</option>' +
        data.members.map(member =>
            `<option value="${member.id}">${escapeHTML(member.name)} — ${escapeHTML(member.studentId)}</option>`
        ).join("");

    if (availableBooks.some(book => String(book.id) === previousBook)) {
        $("issueBook").value = previousBook;
    }

    if (data.members.some(member => String(member.id) === previousMember)) {
        $("issueMember").value = previousMember;
    }
}

$("issueDueDate").min = today();

const defaultDueDate = new Date();
defaultDueDate.setDate(defaultDueDate.getDate() + 14);
$("issueDueDate").value =
    new Date(defaultDueDate.getTime() - defaultDueDate.getTimezoneOffset() * 60000)
        .toISOString().slice(0, 10);

$("issueForm").addEventListener("submit", event => {
    event.preventDefault();

    const bookId = Number($("issueBook").value);
    const memberId = Number($("issueMember").value);
    const dueDate = $("issueDueDate").value;

    const book = getBook(bookId);
    const member = getMember(memberId);

    if (!book || !member) {
        showToast("Please select a valid book and member.");
        return;
    }

    if (availableCopies(book) < 1) {
        showToast("This book is no longer available.");
        renderAll();
        return;
    }

    if (!dueDate || dueDate < today()) {
        showToast("Please select today or a future due date.");
        return;
    }

    data.transactions.push({
        id: data.nextTransactionId++,
        bookId,
        memberId,
        issueDate: today(),
        dueDate,
        returnDate: "",
        status: "Issued"
    });

    saveData();
    renderAll();
    showToast("Book issued successfully!");
});

// RETURN BOOK
function renderReturns() {
    const issued = data.transactions
        .filter(t => t.status === "Issued")
        .sort((a, b) => b.id - a.id);

    $("returnTable").innerHTML = issued.length
        ? issued.map(t => `
            <tr>
                <td>${escapeHTML(getBook(t.bookId)?.title || "Deleted book")}</td>
                <td>${escapeHTML(getMember(t.memberId)?.name || "Deleted member")}</td>
                <td>${escapeHTML(t.issueDate)}</td>
                <td>${escapeHTML(t.dueDate)}</td>
                <td>
                    <button class="action-btn" data-action="return-book" data-id="${t.id}">
                        <i class="fa-solid fa-check"></i> Return
                    </button>
                </td>
            </tr>
        `).join("")
        : emptyRow(5, "There are no books waiting to be returned.");
}

// TRANSACTION HISTORY
function renderTransactions() {
    const query = $("transactionSearch").value.toLowerCase().trim();

    const transactions = [...data.transactions]
        .sort((a, b) => b.id - a.id)
        .filter(t => {
            const book = getBook(t.bookId);
            const member = getMember(t.memberId);

            return [
                book?.title,
                member?.name,
                t.issueDate,
                t.dueDate,
                t.returnDate,
                t.status
            ].some(value => String(value || "").toLowerCase().includes(query));
        });

    $("transactionsTable").innerHTML = transactions.length
        ? transactions.map(t => `
            <tr>
                <td>${escapeHTML(getBook(t.bookId)?.title || "Deleted book")}</td>
                <td>${escapeHTML(getMember(t.memberId)?.name || "Deleted member")}</td>
                <td>${escapeHTML(t.issueDate)}</td>
                <td>${escapeHTML(t.dueDate)}</td>
                <td>${escapeHTML(t.returnDate || "—")}</td>
                <td>${statusHTML(t)}</td>
            </tr>
        `).join("")
        : emptyRow(6, "No matching transactions found.");
}

$("transactionSearch").addEventListener("input", renderTransactions);

// BUTTON ACTIONS
document.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const id = Number(button.dataset.id);

    if (action === "delete-book") {
        const hasActiveIssue = data.transactions.some(t =>
            t.bookId === id && t.status === "Issued"
        );

        if (hasActiveIssue) {
            showToast("Return the issued copies before deleting this book.");
            return;
        }

        if (!confirm("Are you sure you want to delete this book?")) return;

        data.books = data.books.filter(book => book.id !== id);
        saveData();
        renderAll();
        showToast("Book deleted.");
    }

    if (action === "delete-member") {
        const hasActiveIssue = data.transactions.some(t =>
            t.memberId === id && t.status === "Issued"
        );

        if (hasActiveIssue) {
            showToast("This member must return issued books first.");
            return;
        }

        if (!confirm("Are you sure you want to delete this member?")) return;

        data.members = data.members.filter(member => member.id !== id);
        saveData();
        renderAll();
        showToast("Member deleted.");
    }

    if (action === "return-book") {
        const transaction = data.transactions.find(t =>
            t.id === id && t.status === "Issued"
        );

        if (!transaction) {
            showToast("This transaction has already been completed.");
            return;
        }

        const bookTitle = getBook(transaction.bookId)?.title || "this book";

        if (!confirm(`Confirm return of "${bookTitle}"?`)) return;

        transaction.status = "Returned";
        transaction.returnDate = today();

        saveData();
        renderAll();
        showToast("Book returned successfully!");
    }
});

// REFRESH ALL VIEWS
function renderAll() {
    renderDashboard();
    renderBooks();
    renderMembers();
    renderIssueOptions();
    renderReturns();
    renderTransactions();
}

// INITIALIZE
renderAll();