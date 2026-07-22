// =====================================
// APP.JS
// Quản lý chuyển trang
// =====================================


// Trang mặc định sau khi đăng nhập
const DEFAULT_PAGE =
    "dossier";


// Dùng để tránh lỗi khi người dùng
// chuyển trang liên tục
let currentPageRequestId =
    0;


// =====================================
// GỌI HÀM MODULE AN TOÀN
// =====================================

async function callPageFunction(
    functionName,
    ...args
){

    const pageFunction =
        window[functionName];


    if(
        typeof pageFunction !==
        "function"
    ){

        return null;

    }


    return await pageFunction(
        ...args
    );

}


// =====================================
// LOAD TRANG
// =====================================

async function loadPage(
    page = DEFAULT_PAGE
){

    const content =
        document.getElementById(
            "content"
        );


    if(!content){

        console.error(
            "Không tìm thấy id content."
        );

        return;

    }


    const requestId =
        ++currentPageRequestId;


    content.innerHTML = `

        <div
            style="
                text-align:center;
                padding:40px;
                color:#6b7280;
            "
        >
            Đang tải trang...
        </div>

    `;


    try{

        const response =
            await fetch(

                `./pages/${page}.html`

            );


        if(!response.ok){

            throw new Error(

                `Không tìm thấy trang ${page}.`

            );

        }


        const html =
            await response.text();


        /*
        Nếu người dùng đã chuyển sang trang khác
        trong lúc trang hiện tại đang tải,
        không hiển thị kết quả cũ.
        */

        if(
            requestId !==
            currentPageRequestId
        ){

            return;

        }


        content.innerHTML =
            html;


        await initializePage(
            page
        );

    }catch(error){

        if(
            requestId !==
            currentPageRequestId
        ){

            return;

        }


        console.error(
            `Không tải được trang ${page}:`,
            error
        );


        content.innerHTML = `

            <div
                style="
                    padding:30px;
                    color:#dc2626;
                "
            >

                <h2>
                    Không tải được trang
                </h2>

                <p>
                    ${escapeAppHtml(
                        error.message ||
                        "Đã xảy ra lỗi."
                    )}
                </p>

            </div>

        `;

    }

}


// =====================================
// KHỞI TẠO DỮ LIỆU TỪNG TRANG
// =====================================

async function initializePage(page){

    switch(page){

        // -----------------------------
        // NHÀ CUNG CẤP
        // -----------------------------

        case "supplier":

            await callPageFunction(
                "loadSupplier"
            );


            await callPageFunction(
                "renderSupplier"
            );

            break;


        // -----------------------------
        // DỰ ÁN
        // -----------------------------

        case "project":

            await callPageFunction(
                "loadProject"
            );


            await callPageFunction(
                "renderProject"
            );

            break;


        // -----------------------------
        // DANH SÁCH HỒ SƠ
        // -----------------------------

        case "dossier":

            await callPageFunction(
                "loadDossier"
            );


            await callPageFunction(
                "filterDossier"
            );

            break;


        // -----------------------------
        // HỒ SƠ CẦN BỔ SUNG
        // -----------------------------

        case "dossier_missing":

            await callPageFunction(
                "loadDossier"
            );


            await callPageFunction(
                "loadMissingDossierFilters"
            );


            await callPageFunction(
                "filterMissingDossier"
            );

            break;


        // -----------------------------
        // HỒ SƠ ĐÃ BÀN GIAO
        // -----------------------------

        case "dossier_delivery":

            await callPageFunction(
                "loadDossier"
            );


            await callPageFunction(
                "loadDeliveryDossierFilters"
            );


            await callPageFunction(
                "filterDeliveryDossier"
            );

            break;


        // -----------------------------
        // HỒ SƠ ĐÃ THANH TOÁN
        // -----------------------------

        case "dossier_paid":

            await callPageFunction(
                "loadDossier"
            );


            await callPageFunction(
                "loadPaidDossierFilters"
            );


            await callPageFunction(
                "filterPaidDossier"
            );

            break;


        // -----------------------------
        // HỒ SƠ LƯU
        // -----------------------------

        case "dossier_archive":

            await callPageFunction(
                "initializeArchivePage"
            );

            break;


        // -----------------------------
        // QUẢN LÝ THƯ
        // -----------------------------

        case "letter":

            await callPageFunction(
                "initializeLetterPage"
            );

            break;


        // -----------------------------
        // SAO LƯU
        // -----------------------------

        case "backup":

            await callPageFunction(
                "initializeBackupPage"
            );

            break;


        default:

            console.warn(
                `Trang "${page}" chưa có hàm khởi tạo riêng.`
            );

            break;

    }

}


// =====================================
// CHỐNG KÝ TỰ HTML TRONG THÔNG BÁO
// =====================================

function escapeAppHtml(value){

    return String(value ?? "")

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


// =====================================
// MENU HỒ SƠ
// =====================================

function toggleMenu(
    menuId,
    element
){

    const menu =
        document.getElementById(
            menuId
        );


    if(!menu){

        return;

    }


    const arrow =
        element
        ? element.querySelector(
            ".arrow"
        )
        : null;


    const isOpen =

        window
        .getComputedStyle(menu)
        .display !== "none";


    if(isOpen){

        menu.style.display =
            "none";


        if(arrow){

            arrow.textContent =
                "▶";

        }

    }else{

        menu.style.display =
            "block";


        if(arrow){

            arrow.textContent =
                "▼";

        }

    }

}


// =====================================
// MENU ACTIVE
// =====================================

function selectMenu(element){

    document
    .querySelectorAll(
        ".menu li"
    )
    .forEach(item => {

        item.classList.remove(
            "active"
        );

    });


    if(element){

        element.classList.add(
            "active"
        );

    }

}


// =====================================
// MỞ MENU HỒ SƠ MẶC ĐỊNH
// =====================================

function openDefaultDossierMenu(){

    const dossierMenu =
        document.getElementById(
            "hosoMenu"
        );


    if(!dossierMenu){

        return;

    }


    dossierMenu.style.display =
        "block";


    const menuHeader =
        dossierMenu
        .previousElementSibling;


    const arrow =
        menuHeader
        ? menuHeader.querySelector(
            ".arrow"
        )
        : null;


    if(arrow){

        arrow.textContent =
            "▼";

    }


    const firstDossierMenuItem =
        dossierMenu.querySelector(
            "li"
        );


    if(firstDossierMenuItem){

        selectMenu(
            firstDossierMenuItem
        );

    }

}


// =====================================
// KHỞI ĐỘNG HỆ THỐNG
// =====================================

document.addEventListener(

    "DOMContentLoaded",

    async function(){

        /*
        Chỉ tải dữ liệu khi đã có phiên đăng nhập.

        auth.js sẽ chuyển sang login.html
        nếu người dùng chưa đăng nhập.
        */

        if(
            typeof Parse !==
            "undefined"

            &&

            !Parse.User.current()
        ){

            return;

        }


        openDefaultDossierMenu();


        await loadPage(
            DEFAULT_PAGE
        );

    }

);


// =====================================
// ĐƯA HÀM RA WINDOW
// =====================================

window.loadPage =
    loadPage;

window.initializePage =
    initializePage;

window.toggleMenu =
    toggleMenu;

window.selectMenu =
    selectMenu;

// =====================================
// CHỦ ĐỀ GIAO DIỆN
// =====================================

const APP_THEME_STORAGE_KEY =
    "selectedAppTheme";


const APP_THEME_CLASSES = [

    "theme-ocean",
    "theme-sage",
    "theme-emerald",
    "theme-violet",
    "theme-dark"

];


// =====================================
// ÁP DỤNG CHỦ ĐỀ
// =====================================

function changeAppTheme(themeName){

    const validTheme =

        APP_THEME_CLASSES.includes(
            themeName
        )

        ? themeName

        : "theme-ocean";


    /*
    Xóa tất cả class chủ đề cũ
    */

    APP_THEME_CLASSES.forEach(theme => {

        document.body.classList.remove(
            theme
        );

    });


    /*
    Thêm chủ đề mới
    */

    document.body.classList.add(
        validTheme
    );


    /*
    Lưu chủ đề vào trình duyệt
    */

    localStorage.setItem(

        APP_THEME_STORAGE_KEY,

        validTheme

    );


    /*
    Đồng bộ lại ô select
    */

    const themeSelect =
        document.getElementById(
            "appThemeSelect"
        );


    if(themeSelect){

        themeSelect.value =
            validTheme;

    }

}


// =====================================
// ĐỌC CHỦ ĐỀ ĐÃ LƯU
// =====================================

function loadSavedAppTheme(){

    const savedTheme =
        localStorage.getItem(
            APP_THEME_STORAGE_KEY
        )

        ||

        "theme-ocean";


    changeAppTheme(
        savedTheme
    );

}


// =====================================
// CHẠY KHI TẢI TRANG
// =====================================

document.addEventListener(

    "DOMContentLoaded",

    function(){

        loadSavedAppTheme();

    }

);


// =====================================
// ĐƯA HÀM RA WINDOW
// HTML đang gọi bằng onchange
// =====================================

window.changeAppTheme =
    changeAppTheme;

// =====================================
// TOAST THÔNG BÁO
// =====================================

function showAppToast(
    message,
    type = "success"
){

    let container =
        document.querySelector(
            ".app-toast-container"
        );


    if(!container){

        container =
            document.createElement(
                "div"
            );


        container.className =
            "app-toast-container";


        document.body.appendChild(
            container
        );

    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =

        `app-toast app-toast-${type}`;


    let icon =
        "✓";


    if(type === "error"){

        icon =
            "⚠";

    }


    if(type === "info"){

        icon =
            "🌿";

    }


    toast.innerHTML = `

        <span class="app-toast-icon">
            ${icon}
        </span>

        <span>
            ${String(message)}
        </span>

    `;


    container.appendChild(
        toast
    );


    setTimeout(() => {

        toast.classList.add(
            "is-leaving"
        );


        setTimeout(() => {

            toast.remove();

        }, 230);

    }, 2800);

}


window.showAppToast =
    showAppToast;
