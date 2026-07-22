// =====================================
// DOSSIER.JS
// Quản lý Hồ sơ bằng Back4App
// =====================================

const DOSSIER_CLASS_NAME =
    "Dossier";

const DOSSIER_MIGRATION_KEY =
    "dossierBack4AppMigrationV1";


let dossiers =
    getDossierStorageArray(
        "dossiers"
    );

let editingDossierId =
    null;

let dossierDataLoaded =
    false;

let dossierLoadingPromise =
    null;

let dossierMigrationPromise =
    null;


// Hồ sơ đang được tick chọn
const selectedDossierIds =
    new Set();


// Hồ sơ đang hiển thị sau khi lọc
let currentRenderedDossiers =
    [];

// =====================================
// PHÂN TRANG HỒ SƠ
// =====================================

let dossierCurrentPage =
    1;


let dossierPageSize =
    20;


/*
Chứa toàn bộ kết quả sau khi tìm kiếm,
lọc và sắp xếp.

Bảng chỉ lấy một phần từ mảng này.
*/

let dossierFilteredData =
    [];

// =====================================
// HÀM HỖ TRỢ CHUNG
// =====================================

function getDossierElement(id){

    return document.getElementById(id);

}


function getDossierInputValue(id){

    const element =
        getDossierElement(id);


    return element

        ? String(
            element.value || ""
        ).trim()

        : "";

}


function setDossierInputValue(
    id,
    value
){

    const element =
        getDossierElement(id);


    if(element){

        element.value =
            value ?? "";

    }

}


function setDossierChecked(
    id,
    checked
){

    const element =
        getDossierElement(id);


    if(element){

        element.checked =
            Boolean(checked);

    }

}


function getDossierProjects(){

    return (

        typeof projects !==
        "undefined"

        &&

        Array.isArray(projects)

    )

        ? projects

        : [];

}


function getDossierSuppliers(){

    return (

        typeof suppliers !==
        "undefined"

        &&

        Array.isArray(suppliers)

    )

        ? suppliers

        : [];

}


function getDossierProjectById(id){

    return getDossierProjects()
        .find(item =>

            String(item.id)

            ===

            String(id)

        );

}


function getDossierSupplierById(id){

    return getDossierSuppliers()
        .find(item =>

            String(item.id)

            ===

            String(id)

        );

}


function normalizeDossierText(value){

    return String(value || "")

        .normalize("NFD")

        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

        .toLowerCase()

        .trim();

}


function escapeDossierHtml(value){

    return String(value ?? "")

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");

}

// =====================================
// TẠO BADGE TRẠNG THÁI
// =====================================

function renderDossierBadge(
    type,
    value
){

    const text =
        String(value || "").trim();


    let className =
        "";


    if(type === "status"){

        className =

            text === "Đã duyệt"

            ? "dossier-badge-approved"

            : "dossier-badge-pending";

    }


    if(type === "file"){

        className =

            text === "Đã up"

            ? "dossier-badge-file-uploaded"

            : "dossier-badge-file-missing";

    }


    if(type === "payment"){

        if(text === "Đã thanh toán"){

            className =
                "dossier-badge-paid";

        }else if(text === "Đang xử lý"){

            className =
                "dossier-badge-processing";

        }else if(text === "Đã xuất ĐNTT"){

            className =
                "dossier-badge-requested";

        }else{

            className =
                "dossier-badge-unpaid";

        }

    }


    if(type === "delivery"){

        className =

            text === "Chưa bàn giao"

            ? "dossier-badge-not-delivered"

            : "dossier-badge-delivered";

    }


    return `

        <span
            class="dossier-badge ${className}"
        >
            ${escapeDossierHtml(text)}
        </span>

    `;

}

function getDossierStorageArray(key){

    try{

        const rawData =
            localStorage.getItem(key);


        if(!rawData){

            return [];

        }


        const parsedData =
            JSON.parse(rawData);


        return Array.isArray(parsedData)

            ? parsedData

            : [];

    }catch(error){

        console.error(
            `Không đọc được dữ liệu ${key}:`,
            error
        );


        return [];

    }

}


function saveDossiersToStorage(){

    try{

        localStorage.setItem(

            "dossiers",

            JSON.stringify(dossiers)

        );

    }catch(error){

        console.error(
            "Không cập nhật được cache Hồ sơ:",
            error
        );

    }

}


function ensureDossierBack4AppReady(){

    if(typeof Parse === "undefined"){

        throw new Error(
            "Parse SDK chưa được tải."
        );

    }


    if(
        window.BACK4APP_CONFIG_READY !==
        true
    ){

        throw new Error(
            "Back4App chưa được khởi tạo."
        );

    }


    if(!Parse.User.current()){

        throw new Error(
            "Phiên đăng nhập không còn hiệu lực."
        );

    }

}


function parseDossierValue(value){

    const cleanedValue =
        String(value ?? "")

            .replace(
                /[^\d-]/g,
                ""
            );


    const numberValue =
        Number(cleanedValue);


    return Number.isFinite(numberValue)

        ? numberValue

        : 0;

}


function formatDossierDate(date){

    if(!date){

        return "";

    }


    const parts =
        String(date).split("-");


    if(parts.length !== 3){

        return String(date);

    }


    return `${parts[2]}/${parts[1]}/${parts[0]}`;

}


function setDossierSaveBusy(
    isBusy,
    isEditing
){

    const button =
        getDossierElement(
            "dossierSaveButton"
        );


    if(!button){

        return;

    }


    button.disabled =
        isBusy;


    button.textContent =

        isBusy

        ? "Đang lưu..."

        : (
            isEditing

            ? "Cập nhật hồ sơ"

            : "Lưu hồ sơ"
        );

}


function setDossierTableMessage(
    message,
    isError = false
){

    const table =
        getDossierElement(
            "dossierTable"
        );


    if(!table){

        return;

    }


    currentRenderedDossiers =
        [];


    table.innerHTML = `

        <tr>

            <td
                colspan="14"
                style="
                    text-align:center;
                    padding:25px;
                    color:${
                        isError
                        ? "#dc2626"
                        : "#6b7280"
                    };
                "
            >
                ${escapeDossierHtml(message)}
            </td>

        </tr>

    `;


    updateDossierSelectionUI();

}


// =====================================
// CHUYỂN PARSE OBJECT THÀNH OBJECT THƯỜNG
// =====================================

function dossierParseObjectToPlain(
    parseObject,
    fallbackDossier = null
){

    const fallbackLegacyId =

        fallbackDossier

        &&

        fallbackDossier.id

        &&

        String(fallbackDossier.id)

        !==

        String(
            fallbackDossier.back4appId ||
            ""
        )

        ? String(
            fallbackDossier.id
        )

        : "";


    const legacyId =
        String(

            parseObject.get(
                "legacyId"
            )

            ||

            fallbackDossier?.legacyId

            ||

            fallbackLegacyId

            ||

            ""

        ).trim();


    const back4appId =
        String(

            parseObject.id

            ||

            fallbackDossier?.back4appId

            ||

            ""

        );


    return {

        id:
    back4appId

    ||

    legacyId

    ||

    fallbackDossier?.id

    ||

    "",


        legacyId:
            legacyId,


        back4appId:
            back4appId,


        code:
            String(

                parseObject.get("code")

                ??

                fallbackDossier?.code

                ??

                ""

            ),


        projectId:
            String(

                parseObject.get(
                    "projectId"
                )

                ??

                fallbackDossier?.projectId

                ??

                ""

            ),


        content:
            String(

                parseObject.get(
                    "content"
                )

                ??

                fallbackDossier?.content

                ??

                ""

            ),


        supplierId:
            String(

                parseObject.get(
                    "supplierId"
                )

                ??

                fallbackDossier?.supplierId

                ??

                ""

            ),


        value:
            parseDossierValue(

                parseObject.get("value")

                ??

                fallbackDossier?.value

                ??

                0

            ),


        documents:
            String(

                parseObject.get(
                    "documents"
                )

                ??

                fallbackDossier?.documents

                ??

                fallbackDossier?.additionalDocuments

                ??

                ""

            ),


        fileStatus:
            String(

                parseObject.get(
                    "fileStatus"
                )

                ??

                fallbackDossier?.fileStatus

                ??

                "Chưa up"

            ),


        paymentRequest:
            Boolean(

                parseObject.get(
                    "paymentRequest"
                )

                ??

                fallbackDossier?.paymentRequest

                ??

                false

            ),


        receiveDate:
            String(

                parseObject.get(
                    "receiveDate"
                )

                ??

                fallbackDossier?.receiveDate

                ??

                ""

            ),


        deliveryDate:
            String(

                parseObject.get(
                    "deliveryDate"
                )

                ??

                fallbackDossier?.deliveryDate

                ??

                ""

            ),


        paymentStatus:
            String(

                parseObject.get(
                    "paymentStatus"
                )

                ??

                fallbackDossier?.paymentStatus

                ??

                "Chưa thanh toán"

            ),


        status:
    String(

        parseObject.get(
            "status"
        )

        ??

        parseObject.get(
            "dossierStatus"
        )

        ??

        fallbackDossier?.status

        ??

        fallbackDossier?.dossierStatus

        ??

        "Chưa duyệt"

    ),


        note:
            String(

                parseObject.get("note")

                ??

                fallbackDossier?.note

                ??

                ""

            ),


        createdAt:

            parseObject.createdAt

            ? parseObject.createdAt
                .toISOString()

            : (
                fallbackDossier?.createdAt
                ||
                ""
            ),


        updatedAt:

            parseObject.updatedAt

            ? parseObject.updatedAt
                .toISOString()

            : (
                fallbackDossier?.updatedAt
                ||
                ""
            )

    };

}


// =====================================
// GÁN DỮ LIỆU CHO PARSE OBJECT
// =====================================

function setDossierParseFields(
    dossierObject,
    data
){

    dossierObject.set(
        "code",
        String(data.code || "").trim()
    );


    dossierObject.set(
        "codeNormalized",
        normalizeDossierText(
            data.code
        )
    );


    dossierObject.set(
        "projectId",
        String(
            data.projectId || ""
        )
    );


    dossierObject.set(
        "content",
        String(
            data.content || ""
        )
    );


    dossierObject.set(
        "supplierId",
        String(
            data.supplierId || ""
        )
    );


    dossierObject.set(
        "value",
        parseDossierValue(
            data.value
        )
    );


    dossierObject.set(
        "documents",
        String(

            data.documents

            ||

            data.additionalDocuments

            ||

            ""

        )
    );


    dossierObject.set(
        "fileStatus",
        String(
            data.fileStatus ||
            "Chưa up"
        )
    );


    dossierObject.set(
        "paymentRequest",
        Boolean(
            data.paymentRequest
        )
    );


    dossierObject.set(
        "receiveDate",
        String(
            data.receiveDate || ""
        )
    );


    dossierObject.set(
        "deliveryDate",
        String(
            data.deliveryDate || ""
        )
    );


    dossierObject.set(
        "paymentStatus",
        String(
            data.paymentStatus ||
            "Chưa thanh toán"
        )
    );


    dossierObject.set(
        "status",
        String(

            data.status

            ||

            data.dossierStatus

            ||

            "Chưa duyệt"

        )
    );


    dossierObject.set(
        "note",
        String(
            data.note || ""
        )
    );

}


// =====================================
// TÌM HỒ SƠ ĐÃ MIGRATE
// =====================================

async function findExistingDossierForMigration(
    item
){

    const back4appId =
        String(
            item.back4appId || ""
        ).trim();


    if(back4appId){

        try{

            const queryByObjectId =
                new Parse.Query(
                    DOSSIER_CLASS_NAME
                );


            return await queryByObjectId.get(
                back4appId
            );

        }catch(error){

            // Tiếp tục tìm bằng ID cũ.

        }

    }


    const legacyId =
        String(
            item.id || ""
        ).trim();


    if(legacyId){

        const queryByLegacyId =
            new Parse.Query(
                DOSSIER_CLASS_NAME
            );


        queryByLegacyId.equalTo(
            "legacyId",
            legacyId
        );


        const foundByLegacyId =
            await queryByLegacyId.first();


        if(foundByLegacyId){

            return foundByLegacyId;

        }

    }


    const normalizedCode =
        normalizeDossierText(
            item.code
        );


    if(normalizedCode){

        const queryByCode =
            new Parse.Query(
                DOSSIER_CLASS_NAME
            );


        queryByCode.equalTo(
            "codeNormalized",
            normalizedCode
        );


        return await queryByCode.first();

    }


    return null;

}


// =====================================
// MIGRATE HỒ SƠ CŨ LÊN BACK4APP
// =====================================

async function migrateDossiersToBack4App(
    force = false
){

    if(dossierMigrationPromise){

        return dossierMigrationPromise;

    }


    dossierMigrationPromise =
        (async function(){

            ensureDossierBack4AppReady();


            if(
                !force

                &&

                localStorage.getItem(
                    DOSSIER_MIGRATION_KEY
                )
            ){

                return {

                    migrated: 0,
                    skipped: 0,
                    failed: 0,
                    alreadyCompleted: true

                };

            }


            const oldDossiers =
                getDossierStorageArray(
                    "dossiers"
                );


            const currentUser =
                Parse.User.current();


            let migrated = 0;
            let skipped = 0;
            let failed = 0;


            for(const item of oldDossiers){

                try{

                    const code =
                        String(
                            item.code || ""
                        ).trim();


                    if(!code){

                        failed += 1;

                        continue;

                    }


                    const legacyId =
                        String(
                            item.id || ""
                        ).trim();


                    const existingDossier =
                        await findExistingDossierForMigration(
                            item
                        );


                    if(existingDossier){

                        if(
                            legacyId

                            &&

                            !existingDossier.get(
                                "legacyId"
                            )
                        ){

                            existingDossier.set(
                                "legacyId",
                                legacyId
                            );


                            if(currentUser){

                                existingDossier.set(
                                    "updatedBy",
                                    currentUser
                                );

                            }


                            await existingDossier.save();

                        }


                        skipped += 1;

                        continue;

                    }


                    const dossierObject =
                        new Parse.Object(
                            DOSSIER_CLASS_NAME
                        );


                    setDossierParseFields(
                        dossierObject,
                        item
                    );


                    if(legacyId){

                        dossierObject.set(
                            "legacyId",
                            legacyId
                        );

                    }


                    if(currentUser){

                        dossierObject.set(
                            "createdBy",
                            currentUser
                        );


                        dossierObject.set(
                            "updatedBy",
                            currentUser
                        );

                    }


                    await dossierObject.save();


                    migrated += 1;

                }catch(error){

                    failed += 1;


                    console.error(
                        "Không migrate được hồ sơ:",
                        item,
                        error
                    );

                }

            }


            localStorage.setItem(

                DOSSIER_MIGRATION_KEY,

                JSON.stringify({

                    completedAt:
                        new Date()
                            .toISOString(),

                    migrated,
                    skipped,
                    failed

                })

            );


            return {

                migrated,
                skipped,
                failed,
                alreadyCompleted: false

            };

        })();


    try{

        return await dossierMigrationPromise;

    }finally{

        dossierMigrationPromise =
            null;

    }

}


// =====================================
// SẮP XẾP HỒ SƠ MỚI NHẤT
// =====================================

function getDossierCreatedTime(item){

    const createdAtTime =
        Date.parse(
            item.createdAt || ""
        );


    if(!Number.isNaN(createdAtTime)){

        return createdAtTime;

    }


    const oldIdTime =
        Number(
            item.legacyId ||
            item.id ||
            0
        );


    return Number.isFinite(oldIdTime)

        ? oldIdTime

        : 0;

}


function sortDossiersNewestFirst(){

    dossiers.sort(

        (a, b) =>

            getDossierCreatedTime(b)

            -

            getDossierCreatedTime(a)

    );

}
// =====================================
// TÍNH TỔNG SỐ TRANG
// =====================================

function getDossierTotalPages(){

    const totalItems =
        dossierFilteredData.length;


    return Math.max(

        1,

        Math.ceil(

            totalItems

            /

            dossierPageSize

        )

    );

}


// =====================================
// HIỂN THỊ TRANG HIỆN TẠI
// =====================================

function renderCurrentDossierPage(){

    const totalItems =
        dossierFilteredData.length;


    const totalPages =
        getDossierTotalPages();


    /*
    Đảm bảo trang hiện tại không vượt giới hạn.
    */

    dossierCurrentPage =
        Math.min(

            Math.max(
                dossierCurrentPage,
                1
            ),

            totalPages

        );


    const startIndex =

        (
            dossierCurrentPage - 1
        )

        *

        dossierPageSize;


    const endIndex =
        Math.min(

            startIndex

            +

            dossierPageSize,

            totalItems

        );


    const pageItems =
        dossierFilteredData.slice(

            startIndex,

            endIndex

        );


    /*
    Hàm renderDossier chỉ nhận dữ liệu của
    trang hiện tại, ví dụ 20 hồ sơ.
    */

    renderDossier(
        pageItems
    );


    renderDossierPagination(

        totalItems,

        totalPages,

        startIndex,

        endIndex

    );

}


// =====================================
// HIỂN THỊ THANH PHÂN TRANG
// =====================================

function renderDossierPagination(
    totalItems,
    totalPages,
    startIndex,
    endIndex
){

    const infoElement =
        getDossierElement(
            "dossierPaginationInfo"
        );


    const totalPagesElement =
        getDossierElement(
            "dossierTotalPages"
        );


    const pageSelect =
        getDossierElement(
            "dossierPageSelect"
        );


    const firstButton =
        getDossierElement(
            "dossierFirstPageButton"
        );


    const previousButton =
        getDossierElement(
            "dossierPreviousPageButton"
        );


    const nextButton =
        getDossierElement(
            "dossierNextPageButton"
        );


    const lastButton =
        getDossierElement(
            "dossierLastPageButton"
        );


    /*
    Ví dụ:
    Hiển thị 21–40 trên 200 hồ sơ.
    */

    if(infoElement){

        if(totalItems === 0){

            infoElement.textContent =
                "Không có hồ sơ phù hợp";

        }else{

            infoElement.textContent =

                `Hiển thị ${startIndex + 1}–${endIndex} trên ${totalItems} hồ sơ`;

        }

    }


    if(totalPagesElement){

        totalPagesElement.textContent =
            `/ ${totalPages}`;

    }


    /*
    Tạo danh sách số trang.
    */

    if(pageSelect){

        let pageOptions =
            "";


        for(
            let page = 1;

            page <= totalPages;

            page += 1
        ){

            pageOptions += `

                <option
                    value="${page}"
                    ${
                        page ===
                        dossierCurrentPage

                        ? "selected"

                        : ""
                    }
                >
                    ${page}
                </option>

            `;

        }


        pageSelect.innerHTML =
            pageOptions;

    }


    const isFirstPage =
        dossierCurrentPage <= 1;


    const isLastPage =
        dossierCurrentPage >= totalPages;


    if(firstButton){

        firstButton.disabled =
            isFirstPage;

    }


    if(previousButton){

        previousButton.disabled =
            isFirstPage;

    }


    if(nextButton){

        nextButton.disabled =
            isLastPage;

    }


    if(lastButton){

        lastButton.disabled =
            isLastPage;

    }

}


// =====================================
// CHUYỂN TRANG
// =====================================

function goToDossierPage(targetPage){

    const totalPages =
        getDossierTotalPages();


    if(targetPage === "first"){

        dossierCurrentPage =
            1;

    }else if(
        targetPage === "previous"
    ){

        dossierCurrentPage -=
            1;

    }else if(
        targetPage === "next"
    ){

        dossierCurrentPage +=
            1;

    }else if(
        targetPage === "last"
    ){

        dossierCurrentPage =
            totalPages;

    }else{

        const pageNumber =
            Number(targetPage);


        if(
            Number.isFinite(pageNumber)

            &&

            pageNumber >= 1
        ){

            dossierCurrentPage =
                pageNumber;

        }

    }


    dossierCurrentPage =
        Math.min(

            Math.max(
                dossierCurrentPage,
                1
            ),

            totalPages

        );


    renderCurrentDossierPage();


    /*
    Đưa vùng bảng trở lại đầu khi chuyển trang.
    */

    const tableScroll =
        document.querySelector(
            ".dossier-table-scroll"
        );


    if(tableScroll){

        tableScroll.scrollTop =
            0;

    }

}


// =====================================
// ĐỔI SỐ HỒ SƠ MỖI TRANG
// =====================================

function changeDossierPageSize(value){

    const newPageSize =
        Number(value);


    if(
        !Number.isFinite(newPageSize)

        ||

        newPageSize <= 0
    ){

        return;

    }


    dossierPageSize =
        newPageSize;


    /*
    Khi đổi số dòng, quay về trang đầu.
    */

    dossierCurrentPage =
        1;


    renderCurrentDossierPage();

}
// =====================================
// THỐNG KÊ TỔNG QUAN HỒ SƠ
// =====================================

function setDossierSummaryNumber(
    elementId,
    value
){

    const element =
        getDossierElement(
            elementId
        );


    if(!element){

        return;

    }


    const newValue =
        String(value);


    /*
    Chỉ chạy animation khi số thực sự thay đổi.
    */

    if(
        element.textContent.trim()

        !==

        newValue
    ){

        element.textContent =
            newValue;


        element.classList.remove(
            "is-updated"
        );


        /*
        Buộc trình duyệt nhận diện lại animation.
        */

        void element.offsetWidth;


        element.classList.add(
            "is-updated"
        );

    }else{

        element.textContent =
            newValue;

    }

}


// =====================================
// TÍNH SỐ LIỆU THỐNG KÊ
// =====================================

function updateDossierSummary(){

    const dossierList =

        Array.isArray(dossiers)

        ? dossiers

        : [];


    /*
    Tổng hồ sơ
    */

    const totalCount =
        dossierList.length;


    /*
    Hồ sơ chưa duyệt
    */

    const pendingCount =
        dossierList.filter(item => {

            const status =
                String(

                    item.status

                    ||

                    item.dossierStatus

                    ||

                    "Chưa duyệt"

                ).trim();


            return status ===
                "Chưa duyệt";

        }).length;


    /*
    Hồ sơ đã bàn giao:
    Có giá trị trong deliveryDate.
    */

    const deliveredCount =
        dossierList.filter(item => {

            return Boolean(

                String(
                    item.deliveryDate || ""
                ).trim()

            );

        }).length;


    /*
    Hồ sơ đã thanh toán.
    */

    const paidCount =
        dossierList.filter(item => {

            const paymentStatus =
                String(

                    item.paymentStatus

                    ||

                    ""

                ).trim();


            return paymentStatus ===
                "Đã thanh toán";

        }).length;


    /*
    Đưa số liệu ra giao diện.
    */

    setDossierSummaryNumber(

        "totalDossierCount",

        totalCount

    );


    setDossierSummaryNumber(

        "pendingDossierCount",

        pendingCount

    );


    setDossierSummaryNumber(

        "deliveredDossierCount",

        deliveredCount

    );


    setDossierSummaryNumber(

        "paidDossierCount",

        paidCount

    );

}

// =====================================
// CHỌN NHIỀU HỒ SƠ
// =====================================

function updateDossierSelectionUI(){

    const selectedCount =
        selectedDossierIds.size;


    const bulkBar =
        getDossierElement(
            "dossierBulkBar"
        );


    const countElement =
        getDossierElement(
            "selectedDossierCount"
        );


    if(bulkBar){

        bulkBar.hidden =
            selectedCount === 0;

    }


    if(countElement){

        countElement.textContent =
            String(selectedCount);

    }


    document
        .querySelectorAll(
            ".dossier-row-checkbox"
        )
        .forEach(checkbox => {

            checkbox.checked =
                selectedDossierIds.has(

                    String(
                        checkbox.value
                    )

                );

        });


    const selectAll =
        getDossierElement(
            "selectAllDossiers"
        );


    if(!selectAll){

        return;

    }


    const visibleIds =
        currentRenderedDossiers.map(

            item =>
                String(item.id)

        );


    const selectedVisibleCount =
        visibleIds.filter(

            id =>
                selectedDossierIds.has(id)

        ).length;


    selectAll.checked =

        visibleIds.length > 0

        &&

        selectedVisibleCount ===
        visibleIds.length;


    selectAll.indeterminate =

        selectedVisibleCount > 0

        &&

        selectedVisibleCount <
        visibleIds.length;

}


function toggleDossierSelection(
    id,
    checked
){

    const dossierId =
        String(id);


    if(checked){

        selectedDossierIds.add(
            dossierId
        );

    }else{

        selectedDossierIds.delete(
            dossierId
        );

    }


    updateDossierSelectionUI();

}


function toggleSelectAllDossiers(
    checked
){
    let rowsHtml = "";
    currentRenderedDossiers.forEach(item => {

        const id =
            String(item.id);


        if(checked){

            selectedDossierIds.add(id);

        }else{

            selectedDossierIds.delete(id);

        }

    });


    updateDossierSelectionUI();

}


function clearDossierSelection(){

    selectedDossierIds.clear();


    const selectAll =
        getDossierElement(
            "selectAllDossiers"
        );


    if(selectAll){

        selectAll.checked =
            false;

        selectAll.indeterminate =
            false;

    }


    updateDossierSelectionUI();

}

// =====================================
// CẬP NHẬT HỒ SƠ HÀNG LOẠT - BẢN NHANH
// =====================================

function getBulkDossierChanges(){

    const changes = {};


    const fileStatus =
        getDossierInputValue(
            "bulkFileStatus"
        );


    const dossierStatus =
        getDossierInputValue(
            "bulkDossierStatus"
        );


    const paymentRequest =
        getDossierInputValue(
            "bulkPaymentRequest"
        );


    const paymentStatus =
        getDossierInputValue(
            "bulkPaymentStatus"
        );


    const deliveryDate =
        getDossierInputValue(
            "bulkDeliveryDate"
        );


    const clearDeliveryDate =
        Boolean(

            getDossierElement(
                "bulkClearDeliveryDate"
            )?.checked

        );


    if(fileStatus !== ""){

        changes.fileStatus =
            fileStatus;

    }


    if(dossierStatus !== ""){

        changes.status =
            dossierStatus;

    }


    if(paymentRequest !== ""){

        changes.paymentRequest =
            paymentRequest === "true";

    }


    if(paymentStatus !== ""){

        changes.paymentStatus =
            paymentStatus;

    }


    if(clearDeliveryDate){

        changes.deliveryDate =
            "";

    }else if(deliveryDate !== ""){

        changes.deliveryDate =
            deliveryDate;

    }


    return changes;

}


// =====================================
// RESET THANH CẬP NHẬT HÀNG LOẠT
// =====================================

function resetBulkDossierControls(){

    setDossierInputValue(
        "bulkFileStatus",
        ""
    );


    setDossierInputValue(
        "bulkDossierStatus",
        ""
    );


    setDossierInputValue(
        "bulkPaymentRequest",
        ""
    );


    setDossierInputValue(
        "bulkPaymentStatus",
        ""
    );


    setDossierInputValue(
        "bulkDeliveryDate",
        ""
    );


    setDossierChecked(
        "bulkClearDeliveryDate",
        false
    );

}


// =====================================
// CẬP NHẬT OBJECT TRONG BỘ NHỚ
// =====================================

function applyBulkChangesToLocalItem(
    item,
    changes,
    updatedAt
){

    if(
        Object.prototype.hasOwnProperty.call(
            changes,
            "fileStatus"
        )
    ){

        item.fileStatus =
            changes.fileStatus;

    }


    if(
        Object.prototype.hasOwnProperty.call(
            changes,
            "status"
        )
    ){

        item.status =
            changes.status;


        // Giữ tương thích dữ liệu cũ
        item.dossierStatus =
            changes.status;

    }


    if(
        Object.prototype.hasOwnProperty.call(
            changes,
            "paymentRequest"
        )
    ){

        item.paymentRequest =
            changes.paymentRequest;

    }


    if(
        Object.prototype.hasOwnProperty.call(
            changes,
            "paymentStatus"
        )
    ){

        item.paymentStatus =
            changes.paymentStatus;

    }


    if(
        Object.prototype.hasOwnProperty.call(
            changes,
            "deliveryDate"
        )
    ){

        item.deliveryDate =
            changes.deliveryDate;

    }


    item.updatedAt =
        updatedAt;

}


// =====================================
// CẬP NHẬT HÀNG LOẠT LÊN BACK4APP
// =====================================

async function applyBulkDossierUpdate(){

    const selectedItems =
        dossiers.filter(item =>

            selectedDossierIds.has(
                String(item.id)
            )

        );


    if(selectedItems.length === 0){

        alert(
            "Vui lòng chọn ít nhất một hồ sơ."
        );

        return;

    }


    const changes =
        getBulkDossierChanges();


    if(
        Object.keys(changes).length === 0
    ){

        alert(
            "Vui lòng chọn ít nhất một nội dung cần cập nhật."
        );

        return;

    }


    const itemWithoutObjectId =
        selectedItems.find(item =>

            !String(
                item.back4appId || ""
            ).trim()

        );


    if(itemWithoutObjectId){

        alert(

            `Hồ sơ "${itemWithoutObjectId.code}" chưa có objectId trên Back4App.`

        );

        return;

    }


    const confirmed =
        confirm(

            `Cập nhật ${selectedItems.length} hồ sơ đã chọn?`

        );


    if(!confirmed){

        return;

    }


    const button =
        getDossierElement(
            "applyBulkDossierButton"
        );


    if(button){

        button.disabled =
            true;

        button.textContent =
            "Đang cập nhật...";

    }


    const startedAt =
        performance.now();


    try{

        ensureDossierBack4AppReady();


        const currentUser =
            Parse.User.current();


        /*
        Tạo object trực tiếp từ objectId.

        Không query.get từng hồ sơ.
        Không đọc lại từng hồ sơ sau khi lưu.
        */

        const parseObjects =
            selectedItems.map(item => {

                const dossierObject =
                    Parse.Object.createWithoutData(

                        DOSSIER_CLASS_NAME,

                        String(
                            item.back4appId
                        ).trim()

                    );


                /*
                Chỉ gửi những trường được chọn thay đổi.
                Không gửi lại toàn bộ hồ sơ.
                */

                Object.entries(changes)
                    .forEach(
                        ([field, value]) => {

                            dossierObject.set(
                                field,
                                value
                            );

                        }
                    );


                if(currentUser){

                    dossierObject.set(
                        "updatedBy",
                        currentUser
                    );

                }


                return dossierObject;

            });


        /*
        Chia thành nhóm 20 hồ sơ.

        Ví dụ:
        1–20 hồ sơ: 1 batch
        21–40 hồ sơ: 2 batch
        */

        const batchSize =
            20;


        let completedCount =
            0;


        for(
            let index = 0;

            index < parseObjects.length;

            index += batchSize
        ){

            const batch =
                parseObjects.slice(

                    index,

                    index + batchSize

                );


            if(button){

                button.textContent =

                    `Đang cập nhật ${completedCount}/${parseObjects.length}...`;

            }


            await Parse.Object.saveAll(
                batch
            );


            completedCount +=
                batch.length;


            if(button){

                button.textContent =

                    `Đang cập nhật ${completedCount}/${parseObjects.length}...`;

            }

        }


        /*
        Cập nhật ngay dữ liệu đang có trong bộ nhớ.

        Không tải lại toàn bộ class Dossier.
        */

        const updatedAt =
            new Date()
                .toISOString();


        selectedItems.forEach(item => {

            applyBulkChangesToLocalItem(

                item,

                changes,

                updatedAt

            );

        });


        saveDossiersToStorage();


        clearDossierSelection();


        resetBulkDossierControls();


        refreshAllDossierViews();


        const elapsedSeconds =
            (

                (
                    performance.now()

                    -

                    startedAt
                )

                /

                1000

            ).toFixed(2);


        if(
    typeof window.showAppToast ===
    "function"
){

    window.showAppToast(

        `Đã cập nhật ${selectedItems.length} hồ sơ trong ${elapsedSeconds} giây.`,

        "success"

    );

}else{

    alert(

        `Đã cập nhật ${selectedItems.length} hồ sơ.`

    );

}

    }catch(error){

        console.error(
            "Không cập nhật được hồ sơ hàng loạt:",
            error
        );


        alert(

            "Không cập nhật được hồ sơ.\n\n"

            +

            (
                error.message

                ||

                String(error)
            )

        );

    }finally{

        if(button){

            button.disabled =
                false;

            button.textContent =
                "Cập nhật hàng loạt";

        }

    }

}
// =====================================
// ĐỌC HỒ SƠ TỪ BACK4APP
// =====================================

async function fetchDossiersFromBack4App(
    forceReload = false
){

    ensureDossierBack4AppReady();


    if(
        dossierDataLoaded

        &&

        !forceReload
    ){

        return dossiers;

    }


    if(dossierLoadingPromise){

        return dossierLoadingPromise;

    }


    dossierLoadingPromise =
        (async function(){

            const query =
                new Parse.Query(
                    DOSSIER_CLASS_NAME
                );


            query.descending(
                "createdAt"
            );


            query.limit(1000);


            const results =
                await query.find();


            dossiers =
                results.map(

                    item =>

                        dossierParseObjectToPlain(
                            item
                        )

                );


            sortDossiersNewestFirst();


            dossierDataLoaded =
                true;


            saveDossiersToStorage();


            return dossiers;

        })();


    try{

        return await dossierLoadingPromise;

    }finally{

        dossierLoadingPromise =
            null;

    }

}


// =====================================
// CẬP NHẬT CÁC TRANG HỒ SƠ
// =====================================

function refreshAllDossierViews(){

    updateDossierSummary();

    if(
        getDossierElement(
            "dossierTable"
        )
    ){

        filterDossier();

    }


    if(
        getDossierElement(
            "deliveryTable"
        )
    ){

        loadDeliveryDossierFilters();

        filterDeliveryDossier();

    }


    if(
        getDossierElement(
            "paidTable"
        )
    ){

        loadPaidDossierFilters();

        filterPaidDossier();

    }


    if(
        getDossierElement(
            "missingTable"
        )
    ){

        loadMissingDossierFilters();

        filterMissingDossier();

    }

}


// =====================================
// LOAD HỒ SƠ
// =====================================

async function loadDossier(){

    setDossierTableMessage(
        "Đang tải hồ sơ..."
    );


    try{

        await Promise.all([

            typeof loadProjectSelect ===
            "function"

            ? loadProjectSelect()

            : Promise.resolve(),


            typeof loadSupplierSelect ===
            "function"

            ? loadSupplierSelect()

            : Promise.resolve()

        ]);


        await migrateDossiersToBack4App();


        refreshAllDossierViews();


        return dossiers;

    }catch(error){

        console.error(
            "Không tải được Hồ sơ:",
            error
        );


        setDossierTableMessage(

            error.message

            ||

            "Không tải được Hồ sơ.",

            true

        );


        return [];

    }

}


// =====================================
// POPUP FORM
// =====================================

function showDossierModal(){

    const modal =
        getDossierElement(
            "dossierModal"
        );


    if(!modal){

        console.error(
            "Không tìm thấy dossierModal."
        );

        return;

    }


    modal.classList.add(
        "is-open"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "dossier-modal-open"
    );


    setTimeout(() => {

        const codeInput =
            getDossierElement(
                "dossierCode"
            );


        if(!codeInput){

            return;

        }


        try{

            codeInput.focus({
                preventScroll: true
            });

        }catch(error){

            codeInput.focus();

        }

    }, 100);

}


function hideDossierModal(){

    const modal =
        getDossierElement(
            "dossierModal"
        );


    if(modal){

        modal.classList.remove(
            "is-open"
        );


        modal.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    document.body.classList.remove(
        "dossier-modal-open"
    );

}


async function openDossierForm(){

    editingDossierId =
        null;


    resetDossierForm();


    const formTitle =
        getDossierElement(
            "dossierFormTitle"
        );


    if(formTitle){

        formTitle.textContent =
            "Thêm Hồ sơ";

    }


    try{

        await Promise.all([

            typeof loadProjectSelect ===
            "function"

            ? loadProjectSelect()

            : Promise.resolve(),


            typeof loadSupplierSelect ===
            "function"

            ? loadSupplierSelect()

            : Promise.resolve()

        ]);

    }catch(error){

        console.error(
            "Không tải được Dự án hoặc NCC:",
            error
        );

    }


    setDossierSaveBusy(
        false,
        false
    );


    showDossierModal();

}


function closeDossierForm(){

    hideDossierModal();


    editingDossierId =
        null;


    resetDossierForm();

}


function resetDossierForm(){

    setDossierInputValue(
        "dossierCode",
        ""
    );


    setDossierInputValue(
        "dossierProject",
        ""
    );


    setDossierInputValue(
        "dossierContent",
        ""
    );


    setDossierInputValue(
        "dossierSupplier",
        ""
    );


    setDossierInputValue(
        "dossierValue",
        ""
    );


    setDossierInputValue(
        "additionalDocuments",
        ""
    );


    setDossierInputValue(
        "fileStatus",
        "Chưa up"
    );


    setDossierChecked(
        "paymentRequest",
        false
    );


    setDossierInputValue(
        "receiveDate",
        ""
    );


    setDossierInputValue(
        "deliveryDate",
        ""
    );


    setDossierInputValue(
        "paymentStatus",
        "Chưa thanh toán"
    );


    setDossierInputValue(
        "dossierStatus",
        "Chưa duyệt"
    );


    setDossierInputValue(
        "note",
        ""
    );

}


// =====================================
// LƯU / CẬP NHẬT HỒ SƠ
// =====================================

async function saveDossier(){

    const code =
        getDossierInputValue(
            "dossierCode"
        );


    const projectId =
        getDossierInputValue(
            "dossierProject"
        );


    const supplierId =
        getDossierInputValue(
            "dossierSupplier"
        );


    const content =
        getDossierInputValue(
            "dossierContent"
        );


    if(!code){

        alert(
            "Vui lòng nhập mã hồ sơ."
        );

        return;

    }


    if(!projectId){

        alert(
            "Vui lòng chọn Dự án."
        );

        return;

    }


    if(!supplierId){

        alert(
            "Vui lòng chọn Nhà cung cấp."
        );

        return;

    }


    if(!content){

        alert(
            "Vui lòng nhập nội dung hồ sơ."
        );

        return;

    }


    const isEditing =
        editingDossierId !== null;


    const data = {

        code:
            code,


        projectId:
            projectId,


        content:
            content,


        supplierId:
            supplierId,


        value:
            getDossierInputValue(
                "dossierValue"
            ),


        documents:
            getDossierInputValue(
                "additionalDocuments"
            ),


        fileStatus:
            getDossierInputValue(
                "fileStatus"
            )

            ||

            "Chưa up",


        paymentRequest:
            Boolean(

                getDossierElement(
                    "paymentRequest"
                )?.checked

            ),


        receiveDate:
            getDossierInputValue(
                "receiveDate"
            ),


        deliveryDate:
            getDossierInputValue(
                "deliveryDate"
            ),


        paymentStatus:
            getDossierInputValue(
                "paymentStatus"
            )

            ||

            "Chưa thanh toán",


        status:
            getDossierInputValue(
                "dossierStatus"
            )

            ||

            "Chưa duyệt",


        note:
            getDossierInputValue(
                "note"
            )

    };


    setDossierSaveBusy(
        true,
        isEditing
    );


    try{

        ensureDossierBack4AppReady();


        if(!dossierDataLoaded){

            await fetchDossiersFromBack4App(
                true
            );

        }


        const editingDossier =

            isEditing

            ? dossiers.find(item =>

                String(item.id)

                ===

                String(
                    editingDossierId
                )

            )

            : null;


        if(
            isEditing

            &&

            !editingDossier
        ){

            throw new Error(
                "Không tìm thấy hồ sơ cần chỉnh sửa."
            );

        }


        const duplicatedLocally =
            dossiers.some(item => {

                const sameCode =

                    normalizeDossierText(
                        item.code
                    )

                    ===

                    normalizeDossierText(
                        code
                    );


                const differentDossier =

                    !isEditing

                    ||

                    String(item.id)

                    !==

                    String(
                        editingDossierId
                    );


                return (
                    sameCode

                    &&

                    differentDossier
                );

            });


        if(duplicatedLocally){

            alert(
                "Mã hồ sơ này đã tồn tại."
            );

            return;

        }


        let dossierObject;


        if(isEditing){

            const back4appId =
                String(

                    editingDossier.back4appId

                    ||

                    ""

                );


            if(!back4appId){

                throw new Error(
                    "Hồ sơ chưa có objectId trên Back4App."
                );

            }


            dossierObject =
                Parse.Object.createWithoutData(

                    DOSSIER_CLASS_NAME,

                    back4appId

                );


            const legacyId =
                String(

                    editingDossier.legacyId

                    ||

                    (
                        String(
                            editingDossier.id
                        )

                        !==

                        back4appId

                        ? editingDossier.id

                        : ""
                    )

                ).trim();


            if(legacyId){

                dossierObject.set(
                    "legacyId",
                    legacyId
                );

            }

        }else{

            dossierObject =
                new Parse.Object(
                    DOSSIER_CLASS_NAME
                );

        }


        setDossierParseFields(
            dossierObject,
            data
        );


        const currentUser =
            Parse.User.current();


        if(
            !isEditing

            &&

            currentUser
        ){

            dossierObject.set(
                "createdBy",
                currentUser
            );

        }


        if(currentUser){

            dossierObject.set(
                "updatedBy",
                currentUser
            );

        }


        const savedObject =
            await dossierObject.save();


        const savedDossier =
            dossierParseObjectToPlain(

                savedObject,

                editingDossier

            );


        if(isEditing){

            const index =
                dossiers.findIndex(item =>

                    String(item.id)

                    ===

                    String(
                        editingDossierId
                    )

                );


            if(index !== -1){

                dossiers[index] =
                    savedDossier;

            }

        }else{

            dossiers.push(
                savedDossier
            );

        }


        sortDossiersNewestFirst();


        saveDossiersToStorage();


        refreshAllDossierViews();


        closeDossierForm();


        alert(

            isEditing

            ? "Đã cập nhật hồ sơ."

            : "Đã thêm hồ sơ."

        );

    }catch(error){

        console.error(
            "Không lưu được Hồ sơ:",
            error
        );


        alert(

            "Không lưu được Hồ sơ.\n\n"

            +

            (
                error.message

                ||

                "Không thể lưu Hồ sơ."
            )

        );

    }finally{

        setDossierSaveBusy(
            false,
            isEditing
        );

    }

}

// =====================================
// HIỂN THỊ DANH SÁCH HỒ SƠ
// Bản tối ưu: chỉ cập nhật DOM một lần
// =====================================

function renderDossier(
    data = dossiers
){

    const table =
        getDossierElement(
            "dossierTable"
        );


    if(!table){

        return;

    }


    currentRenderedDossiers =

        Array.isArray(data)

        ? data

        : [];


    if(
        currentRenderedDossiers.length ===
        0
    ){

        setDossierTableMessage(
            "Chưa có hồ sơ phù hợp"
        );

        return;

    }


    /*
    Tạo Map để tìm dự án và nhà cung cấp nhanh hơn.

    Không dùng projects.find() và suppliers.find()
    lặp lại cho từng dòng.
    */

    const projectMap =
        new Map(

            getDossierProjects()
                .map(item => [

                    String(item.id),

                    item

                ])

        );


    const supplierMap =
        new Map(

            getDossierSuppliers()
                .map(item => [

                    String(item.id),

                    item

                ])

        );


    /*
    Biến này phải được khai báo trước vòng lặp.
    Đây chính là biến đang bị báo lỗi.
    */

    let rowsHtml =
        "";


    currentRenderedDossiers.forEach(item => {

        const project =
            projectMap.get(
                String(item.projectId)
            );


        const supplier =
            supplierMap.get(
                String(item.supplierId)
            );


        const itemId =
            escapeDossierHtml(
                String(item.id)
            );


        const itemCode =
            escapeDossierHtml(
                item.code || "—"
            );


        rowsHtml += `

            <tr>

                <!-- 1. CHECKBOX -->

                <td class="dossier-select-cell">

                    <input
                        type="checkbox"
                        class="dossier-row-checkbox"
                        value="${itemId}"
                        ${
                            selectedDossierIds.has(
                                String(item.id)
                            )

                            ? "checked"

                            : ""
                        }
                        onchange="
                            toggleDossierSelection(
                                this.value,
                                this.checked
                            )
                        "
                        aria-label="Chọn hồ sơ ${itemCode}"
                    >

                </td>


                <!-- 2. MÃ HỒ SƠ -->

                <td>

                    ${itemCode}

                </td>


                <!-- 3. DỰ ÁN -->

                <td>

                    ${escapeDossierHtml(

                        project

                        ? project.ten || "—"

                        : "Dự án đã xóa"

                    )}

                </td>


                <!-- 4. NỘI DUNG -->

                <td
                    class="dossier-content-cell"
                    title="${escapeDossierHtml(
                        item.content || ""
                    )}"
                >

                    ${escapeDossierHtml(
                        item.content || "—"
                    )}

                </td>


                <!-- 5. NHÀ CUNG CẤP -->

                <td>

                    ${escapeDossierHtml(

                        supplier

                        ? supplier.ten || "—"

                        : "Nhà cung cấp đã xóa"

                    )}

                </td>


                <!-- 6. GIÁ TRỊ -->

               <td
    class="dossier-value-cell"
    title="${Number(
        item.value || 0
    ).toLocaleString(
        "vi-VN"
    )}"
>

    ${Number(
        item.value || 0
    ).toLocaleString(
        "vi-VN"
    )}

</td>


                <!-- 7. BỔ SUNG HỒ SƠ -->

                <td
                    class="dossier-additional-cell"
                    title="${escapeDossierHtml(
                        item.documents || ""
                    )}"
                >

                    ${escapeDossierHtml(
                        item.documents || "—"
                    )}

                </td>


                <!-- 8. FILE HỒ SƠ -->

                <td>

                    ${renderDossierBadge(

                        "file",

                        item.fileStatus ||
                        "Chưa up"

                )}

                </td>


                <!-- 9. TRẠNG THÁI HỒ SƠ -->

                <td>

                    ${renderDossierBadge(

    "status",

    item.status ||
    "Chưa duyệt"

)}
                </td>


                <!-- 10. ĐỀ NGHỊ THANH TOÁN -->

                <td>

                    ${
                        item.paymentRequest
                        ? "✓"
                        : ""
                    }

                </td>


                <!-- 11. BÀN GIAO -->

                <td>

                    ${renderDossierBadge(

    "delivery",

    item.deliveryDate

    ? formatDossierDate(
        item.deliveryDate
    )

    : "Chưa bàn giao"

)}

                </td>


                <!-- 12. THANH TOÁN -->

                <td>

                    ${renderDossierBadge(

    "payment",

    item.paymentStatus ||
    "Chưa thanh toán"

)}

                </td>


                <!-- 13. GHI CHÚ -->

                <td
                    class="dossier-note-cell"
                    title="${escapeDossierHtml(
                        item.note || ""
                    )}"
                >

                    ${escapeDossierHtml(
                        item.note || "—"
                    )}

                </td>


                <!-- 14. THAO TÁC -->

                <td class="dossier-action-cell">

                    <button
                        type="button"
                        onclick="
                            editDossier(
                                '${itemId}'
                            )
                        "
                        aria-label="Sửa hồ sơ"
                    >
                        ✏️
                    </button>


                    <button
    type="button"
    class="dossier-delete-button"
    onclick="
        deleteDossier(
            '${itemId}',
            this
        )
    "
    aria-label="Xóa hồ sơ"
    title="Xóa hồ sơ"
>
    🗑
</button>

                </td>

            </tr>

        `;

    });


    /*
    Chỉ đưa dữ liệu vào bảng một lần
    sau khi đã tạo xong toàn bộ HTML.
    */

    table.innerHTML =
        rowsHtml;


    updateDossierSelectionUI();

}
// =====================================
// TÌM OBJECT HỒ SƠ THẬT TRÊN BACK4APP
// =====================================

async function findDossierObjectForDelete(
    dossier
){

    const possibleObjectIds = [

        dossier.back4appId,

        dossier.id

    ]
    .map(value =>
        String(value || "").trim()
    )
    .filter(Boolean);


    /*
    Loại bỏ ID trùng nhau.
    */

    const uniqueObjectIds =
        [...new Set(possibleObjectIds)];


    /*
    Thử tìm bằng objectId trước.
    */

    for(const objectId of uniqueObjectIds){

        /*
        objectId của Parse thường là chuỗi ID,
        không phải ID dạng timestamp cũ.
        */

        if(
            objectId ===
            String(
                dossier.legacyId || ""
            ).trim()
        ){

            continue;

        }


        try{

            const query =
                new Parse.Query(
                    DOSSIER_CLASS_NAME
                );


            const foundObject =
                await query.get(
                    objectId
                );


            if(foundObject){

                return foundObject;

            }

        }catch(error){

            /*
            Code 101 nghĩa là không tìm thấy object
            hoặc object bị ACL che quyền truy cập.
            */

            if(error?.code !== 101){

                throw error;

            }

        }

    }


    /*
    Thử tìm bằng legacyId.
    */

    const legacyId =
        String(

            dossier.legacyId

            ||

            ""

        ).trim();


    if(legacyId){

        const legacyQuery =
            new Parse.Query(
                DOSSIER_CLASS_NAME
            );


        legacyQuery.equalTo(
            "legacyId",
            legacyId
        );


        const foundByLegacyId =
            await legacyQuery.first();


        if(foundByLegacyId){

            return foundByLegacyId;

        }

    }


    /*
    Thử tìm bằng codeNormalized.
    */

    const codeNormalized =
        normalizeDossierText(
            dossier.code
        );


    if(codeNormalized){

        const codeQuery =
            new Parse.Query(
                DOSSIER_CLASS_NAME
            );


        codeQuery.equalTo(
            "codeNormalized",
            codeNormalized
        );


        const foundByCode =
            await codeQuery.first();


        if(foundByCode){

            return foundByCode;

        }

    }


    /*
    Một số dữ liệu cũ có thể chưa có codeNormalized.
    Thử tìm chính xác bằng code.
    */

    const code =
        String(
            dossier.code || ""
        ).trim();


    if(code){

        const rawCodeQuery =
            new Parse.Query(
                DOSSIER_CLASS_NAME
            );


        rawCodeQuery.equalTo(
            "code",
            code
        );


        const foundByRawCode =
            await rawCodeQuery.first();


        if(foundByRawCode){

            return foundByRawCode;

        }

    }


    return null;

}

// =====================================
// XÓA HỒ SƠ
// =====================================

async function deleteDossier(
    id,
    deleteButton = null
){

    const requestedId =
        String(id || "").trim();


    /*
    Tìm theo cả:
    - id hiện tại;
    - back4appId;
    - legacyId.
    */

    const dossier =
        dossiers.find(item =>

            String(item.id || "") ===
            requestedId

            ||

            String(
                item.back4appId || ""
            ) === requestedId

            ||

            String(
                item.legacyId || ""
            ) === requestedId

        );


    if(!dossier){

        alert(
            "Không tìm thấy hồ sơ trong dữ liệu hiện tại."
        );

        return;

    }


    const confirmed =
        confirm(

            `Bạn có chắc chắn muốn xóa hồ sơ "${dossier.code}"?\n\n`

            +

            "Hồ sơ sẽ bị xóa khỏi Back4App và không thể hoàn tác."

        );


    if(!confirmed){

        return;

    }


    const oldButtonHtml =
        deleteButton?.innerHTML || "🗑";


    if(deleteButton){

        deleteButton.disabled =
            true;

        deleteButton.innerHTML =
            "…";

    }


    try{

        ensureDossierBack4AppReady();


        console.log(
            "Thông tin hồ sơ cần xóa:",
            {
                requestedId,
                id: dossier.id,
                back4appId:
                    dossier.back4appId,
                legacyId:
                    dossier.legacyId,
                code:
                    dossier.code
            }
        );


        /*
        Tìm object thật trên Back4App
        thay vì tin hoàn toàn vào cache local.
        */

        const dossierObject =
            await findDossierObjectForDelete(
                dossier
            );


        /*
        Không tìm thấy object trên server nghĩa là
        dòng local đang bị cũ hoặc object đã bị xóa.
        */

        if(!dossierObject){

            const removeStaleRow =
                confirm(

                    `Không tìm thấy hồ sơ "${dossier.code}" trên Back4App.\n\n`

                    +

                    "Có thể hồ sơ đã bị xóa trước đó hoặc dữ liệu trình duyệt đã cũ.\n\n"

                    +

                    "Bạn có muốn xóa dòng dữ liệu cũ khỏi giao diện không?"

                );


            if(!removeStaleRow){

                return;

            }


            dossiers =
                dossiers.filter(item =>

                    item !== dossier

                );


            selectedDossierIds.delete(
                String(dossier.id)
            );


            selectedDossierIds.delete(
                String(
                    dossier.back4appId ||
                    ""
                )
            );


            saveDossiersToStorage();


            refreshAllDossierViews();


            updateDossierSelectionUI();


            if(
                typeof window.showAppToast ===
                "function"
            ){

                window.showAppToast(

                    `Đã xóa dòng dữ liệu cũ "${dossier.code}".`,

                    "info"

                );

            }else{

                alert(
                    `Đã xóa dòng dữ liệu cũ "${dossier.code}".`
                );

            }


            return;

        }


        const realObjectId =
            String(
                dossierObject.id
            );


        console.log(
            "Đã tìm thấy object Back4App:",
            realObjectId
        );


        /*
        Xóa object thật.
        */

        await dossierObject.destroy();


        console.log(
            "Đã xóa thành công object:",
            realObjectId
        );


        /*
        Xóa khỏi dữ liệu local theo mọi ID liên quan.
        */

        dossiers =
            dossiers.filter(item => {

                const sameReference =
                    item === dossier;


                const sameId =

                    String(item.id || "")

                    ===

                    String(
                        dossier.id || ""
                    );


                const sameBack4AppId =

                    String(
                        item.back4appId || ""
                    )

                    ===

                    realObjectId;


                const sameLegacyId =

                    dossier.legacyId

                    &&

                    String(
                        item.legacyId || ""
                    )

                    ===

                    String(
                        dossier.legacyId
                    );


                return !(

                    sameReference

                    ||

                    sameId

                    ||

                    sameBack4AppId

                    ||

                    sameLegacyId

                );

            });


        selectedDossierIds.delete(
            requestedId
        );


        selectedDossierIds.delete(
            realObjectId
        );


        selectedDossierIds.delete(
            String(
                dossier.id || ""
            )
        );


        saveDossiersToStorage();


        if(
            editingDossierId !== null

            &&

            (
                String(editingDossierId)
                ===
                requestedId

                ||

                String(editingDossierId)
                ===
                realObjectId
            )
        ){

            closeDossierForm();

        }


        refreshAllDossierViews();


        updateDossierSelectionUI();


        if(
            typeof window.showAppToast ===
            "function"
        ){

            window.showAppToast(

                `Đã xóa hồ sơ "${dossier.code}".`,

                "success"

            );

        }else{

            alert(
                `Đã xóa hồ sơ "${dossier.code}".`
            );

        }

    }catch(error){

        console.error(
            "LỖI XÓA HỒ SƠ:",
            {
                code:
                    error?.code,

                message:
                    error?.message,

                error
            }
        );


        let message =
            error?.message

            ||

            String(error);


        if(error?.code === 101){

            message =
                "Back4App không tìm thấy object hoặc ACL đang chặn quyền xóa.";

        }


        if(error?.code === 119){

            message =
                "Tài khoản hiện tại không có quyền Delete đối với class Dossier.";

        }


        if(error?.code === 209){

            message =
                "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";

        }


        alert(

            "Không xóa được Hồ sơ.\n\n"

            +

            message

            +

            `\n\nMã lỗi: ${error?.code ?? "không có"}`

        );

    }finally{

        if(deleteButton){

            deleteButton.disabled =
                false;

            deleteButton.innerHTML =
                oldButtonHtml;

        }

    }

}

// =====================================
// CHỈNH SỬA HỒ SƠ
// =====================================

async function editDossier(id){

    const item =
        dossiers.find(dossierItem =>

            String(dossierItem.id)

            ===

            String(id)

        );


    if(!item){

        alert(
            "Không tìm thấy hồ sơ."
        );

        return;

    }


    try{

        await Promise.all([

            typeof loadProjectSelect ===
            "function"

            ? loadProjectSelect()

            : Promise.resolve(),


            typeof loadSupplierSelect ===
            "function"

            ? loadSupplierSelect()

            : Promise.resolve()

        ]);

    }catch(error){

        console.error(
            "Không tải được dropdown:",
            error
        );

    }


    editingDossierId =
        item.id;


    const formTitle =
        getDossierElement(
            "dossierFormTitle"
        );


    if(formTitle){

        formTitle.textContent =
            "Chỉnh sửa Hồ sơ";

    }


    setDossierInputValue(
        "dossierCode",
        item.code
    );


    setDossierInputValue(
        "dossierProject",
        item.projectId
    );


    setDossierInputValue(
        "dossierContent",
        item.content
    );


    setDossierInputValue(
        "dossierSupplier",
        item.supplierId
    );


    setDossierInputValue(
        "dossierValue",
        item.value
    );


    setDossierInputValue(
        "additionalDocuments",
        item.documents
    );


    setDossierInputValue(
        "fileStatus",
        item.fileStatus ||
        "Chưa up"
    );


    setDossierChecked(
        "paymentRequest",
        item.paymentRequest
    );


    setDossierInputValue(
        "receiveDate",
        item.receiveDate || ""
    );


    setDossierInputValue(
        "deliveryDate",
        item.deliveryDate || ""
    );


    setDossierInputValue(
        "dossierStatus",
        item.status ||
        "Chưa duyệt"
    );


    setDossierInputValue(
        "paymentStatus",
        item.paymentStatus ||
        "Chưa thanh toán"
    );


    setDossierInputValue(
        "note",
        item.note || ""
    );


    setDossierSaveBusy(
        false,
        true
    );


    showDossierModal();

}


// =====================================
// LỌC VÀ SẮP XẾP HỒ SƠ
// =====================================

function filterDossier(){

    const keyword =
        normalizeDossierText(

            getDossierInputValue(
                "searchDossier"
            )

        );


    const statusFilter =
        getDossierInputValue(
            "filterStatus"
        );


    const paymentFilter =
        getDossierInputValue(
            "filterPayment"
        );


    const deliveryFilter =
        getDossierInputValue(
            "filterDelivery"
        );


    const fileFilter =
        getDossierInputValue(
            "filterFile"
        );


    const projectSort =
        getDossierInputValue(
            "filterProjectSort"
        );


    const filtered =
        dossiers.filter(item => {

            const project =
                getDossierProjectById(
                    item.projectId
                );


            const supplier =
                getDossierSupplierById(
                    item.supplierId
                );


            const searchText =
                normalizeDossierText(`

                    ${item.code || ""}

                    ${item.content || ""}

                    ${item.documents || ""}

                    ${project?.ten || ""}

                    ${supplier?.ten || ""}

                    ${item.note || ""}

                `);


            const matchKeyword =
                searchText.includes(
                    keyword
                );


            const matchStatus =

                !statusFilter

                ||

                String(
                    item.status ||
                    "Chưa duyệt"
                )

                ===

                statusFilter;


            const matchPayment =

                !paymentFilter

                ||

                String(
                    item.paymentStatus ||
                    "Chưa thanh toán"
                )

                ===

                paymentFilter;


            const hasDeliveryDate =
                Boolean(

                    String(
                        item.deliveryDate ||
                        ""
                    ).trim()

                );


            const matchDelivery =

                !deliveryFilter

                ||

                (
                    deliveryFilter === "done"

                    &&

                    hasDeliveryDate
                )

                ||

                (
                    deliveryFilter === "not"

                    &&

                    !hasDeliveryDate
                );


            const matchFile =

                !fileFilter

                ||

                String(
                    item.fileStatus ||
                    "Chưa up"
                )

                ===

                fileFilter;


            return (

                matchKeyword

                &&

                matchStatus

                &&

                matchPayment

                &&

                matchDelivery

                &&

                matchFile

            );

        });


    if(
        projectSort === "project-az"

        ||

        projectSort === "project-za"
    ){

        filtered.sort((a, b) => {

            const nameA =
                String(

                    getDossierProjectById(
                        a.projectId
                    )?.ten

                    ||

                    ""

                ).trim();


            const nameB =
                String(

                    getDossierProjectById(
                        b.projectId
                    )?.ten

                    ||

                    ""

                ).trim();


            if(!nameA && nameB){

                return 1;

            }


            if(nameA && !nameB){

                return -1;

            }


            const compared =
                nameA.localeCompare(

                    nameB,

                    "vi",

                    {
                        sensitivity: "base"
                    }

                );


            if(compared !== 0){

                return projectSort ===
                    "project-za"

                    ? -compared

                    : compared;

            }


            return (

                getDossierCreatedTime(b)

                -

                getDossierCreatedTime(a)

            );

        });

    }else{

        filtered.sort(

            (a, b) =>

                getDossierCreatedTime(b)

                -

                getDossierCreatedTime(a)

        );

    }


    /*
Lưu toàn bộ kết quả sau khi lọc.
*/

dossierFilteredData =
    filtered;


/*
Mỗi khi thay đổi bộ lọc hoặc tìm kiếm,
quay về trang đầu.
*/

dossierCurrentPage =
    1;


/*
Chỉ hiển thị dữ liệu của trang hiện tại.
*/

renderCurrentDossierPage();

}


// =====================================
// TRANG HỒ SƠ ĐÃ BÀN GIAO
// =====================================

function loadDossierFilterOptions(
    selectId,
    items,
    placeholder
){

    const select =
        getDossierElement(
            selectId
        );


    if(!select){

        return;

    }


    const currentValue =
        select.value;


    select.innerHTML = `

        <option value="">
            ${escapeDossierHtml(placeholder)}
        </option>

    `;


    [...items]
        .sort((a, b) =>

            String(
                a.ten ||
                a.name ||
                ""
            ).localeCompare(

                String(
                    b.ten ||
                    b.name ||
                    ""
                ),

                "vi"

            )

        )
        .forEach(item => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                String(item.id);


            option.textContent =

                item.ten

                ||

                item.name

                ||

                "Không có tên";


            select.appendChild(
                option
            );

        });


    select.value =
        currentValue;

}


function loadDeliveryDossierFilters(){

    loadDossierFilterOptions(

        "deliveryProjectFilter",

        getDossierProjects(),

        "Tất cả dự án"

    );


    loadDossierFilterOptions(

        "deliverySupplierFilter",

        getDossierSuppliers(),

        "Tất cả nhà cung cấp"

    );

}


function filterDeliveryDossier(){

    const keyword =
        normalizeDossierText(

            getDossierInputValue(
                "deliverySearch"
            )

        );


    const projectId =
        getDossierInputValue(
            "deliveryProjectFilter"
        );


    const supplierId =
        getDossierInputValue(
            "deliverySupplierFilter"
        );


    const paymentFilter =
        getDossierInputValue(
            "deliveryPaymentFilter"
        );


    const dateFrom =
        getDossierInputValue(
            "deliveryDateFrom"
        );


    const dateTo =
        getDossierInputValue(
            "deliveryDateTo"
        );


    if(
        dateFrom

        &&

        dateTo

        &&

        dateFrom > dateTo
    ){

        const table =
            getDossierElement(
                "deliveryTable"
            );


        if(table){

            table.innerHTML = `

                <tr>

                    <td colspan="8">
                        Từ ngày không được lớn hơn Đến ngày
                    </td>

                </tr>

            `;

        }


        return;

    }


    const filtered =
        dossiers.filter(item => {

            const deliveryDate =
                String(
                    item.deliveryDate || ""
                ).trim();


            if(!deliveryDate){

                return false;

            }


            const project =
                getDossierProjectById(
                    item.projectId
                );


            const supplier =
                getDossierSupplierById(
                    item.supplierId
                );


            const searchText =
                normalizeDossierText(`

                    ${item.code || ""}

                    ${item.content || ""}

                    ${item.documents || ""}

                    ${project?.ten || ""}

                    ${supplier?.ten || ""}

                    ${item.note || ""}

                `);


            return (

                searchText.includes(
                    keyword
                )

                &&

                (
                    !projectId

                    ||

                    String(item.projectId)
                    ===
                    projectId
                )

                &&

                (
                    !supplierId

                    ||

                    String(item.supplierId)
                    ===
                    supplierId
                )

                &&

                (
                    !paymentFilter

                    ||

                    String(
                        item.paymentStatus ||
                        "Chưa thanh toán"
                    )

                    ===

                    paymentFilter
                )

                &&

                (
                    !dateFrom

                    ||

                    deliveryDate >=
                    dateFrom
                )

                &&

                (
                    !dateTo

                    ||

                    deliveryDate <=
                    dateTo
                )

            );

        });


    filtered.sort(

        (a, b) =>

            String(
                b.deliveryDate || ""
            ).localeCompare(

                String(
                    a.deliveryDate || ""
                )

            )

    );


    renderDeliveryDossier(
        filtered
    );

}


function renderDeliveryDossier(data){

    const table =
        getDossierElement(
            "deliveryTable"
        );


    if(!table){

        return;

    }


    const resultData =
        Array.isArray(data)

        ? data

        : [];


    const countElement =
        getDossierElement(
            "deliveryResultCount"
        );


    if(countElement){

        countElement.textContent =
            `${resultData.length} hồ sơ`;

    }


    if(resultData.length === 0){

        table.innerHTML = `

            <tr>

                <td colspan="8">
                    Chưa có hồ sơ đã bàn giao phù hợp
                </td>

            </tr>

        `;

        return;

    }


    table.innerHTML =
        resultData.map(item => {

            const project =
                getDossierProjectById(
                    item.projectId
                );


            const supplier =
                getDossierSupplierById(
                    item.supplierId
                );


            return `

                <tr>

                    <td>
                        ${escapeDossierHtml(
                            item.code || "—"
                        )}
                    </td>

                    <td>
                        ${escapeDossierHtml(
                            project?.ten ||
                            "Dự án đã xóa"
                        )}
                    </td>

                    <td>
                        ${escapeDossierHtml(
                            item.content || "—"
                        )}
                    </td>

                    <td>
                        ${escapeDossierHtml(
                            supplier?.ten ||
                            "Nhà cung cấp đã xóa"
                        )}
                    </td>

                    <td>
                        ${Number(
                            item.value || 0
                        ).toLocaleString(
                            "vi-VN"
                        )} đ
                    </td>

                    <td>
                        ${escapeDossierHtml(
                            item.documents || "—"
                        )}
                    </td>

                    <td>
                        ${escapeDossierHtml(
                            formatDossierDate(
                                item.deliveryDate
                            )
                        )}
                    </td>

                    <td>
                        ${escapeDossierHtml(
                            item.paymentStatus ||
                            "Chưa thanh toán"
                        )}
                    </td>

                </tr>

            `;

        }).join("");

}


function resetDeliveryDossierFilters(){

    [

        "deliverySearch",
        "deliveryProjectFilter",
        "deliverySupplierFilter",
        "deliveryPaymentFilter",
        "deliveryDateFrom",
        "deliveryDateTo"

    ].forEach(id =>

        setDossierInputValue(
            id,
            ""
        )

    );


    filterDeliveryDossier();

}


// =====================================
// TRANG ĐÃ THANH TOÁN
// =====================================

function loadPaidDossierFilters(){

    loadDossierFilterOptions(

        "paidProjectFilter",

        getDossierProjects(),

        "Tất cả dự án"

    );


    loadDossierFilterOptions(

        "paidSupplierFilter",

        getDossierSuppliers(),

        "Tất cả nhà cung cấp"

    );

}


function filterPaidDossier(){

    const keyword =
        normalizeDossierText(

            getDossierInputValue(
                "paidSearch"
            )

        );


    const projectId =
        getDossierInputValue(
            "paidProjectFilter"
        );


    const supplierId =
        getDossierInputValue(
            "paidSupplierFilter"
        );


    const deliveryFilter =
        getDossierInputValue(
            "paidDeliveryFilter"
        );


    const fileFilter =
        getDossierInputValue(
            "paidFileFilter"
        );


    const filtered =
        dossiers.filter(item => {

            if(
                String(
                    item.paymentStatus || ""
                ).trim()

                !==

                "Đã thanh toán"
            ){

                return false;

            }


            const project =
                getDossierProjectById(
                    item.projectId
                );


            const supplier =
                getDossierSupplierById(
                    item.supplierId
                );


            const searchText =
                normalizeDossierText(`

                    ${item.code || ""}

                    ${item.content || ""}

                    ${project?.ten || ""}

                    ${supplier?.ten || ""}

                `);


            const hasDelivery =
                Boolean(

                    String(
                        item.deliveryDate || ""
                    ).trim()

                );


            return (

                searchText.includes(
                    keyword
                )

                &&

                (
                    !projectId

                    ||

                    String(item.projectId)
                    ===
                    projectId
                )

                &&

                (
                    !supplierId

                    ||

                    String(item.supplierId)
                    ===
                    supplierId
                )

                &&

                (
                    !deliveryFilter

                    ||

                    (
                        deliveryFilter === "done"

                        &&

                        hasDelivery
                    )

                    ||

                    (
                        deliveryFilter === "not"

                        &&

                        !hasDelivery
                    )
                )

                &&

                (
                    !fileFilter

                    ||

                    String(
                        item.fileStatus ||
                        "Chưa up"
                    )

                    ===

                    fileFilter
                )

            );

        });


    renderPaidDossier(
        filtered
    );

}


function renderPaidDossier(data){

    const table =
        getDossierElement(
            "paidTable"
        );


    if(!table){

        return;

    }


    const resultData =
        Array.isArray(data)

        ? data

        : [];


    const countElement =
        getDossierElement(
            "paidResultCount"
        );


    if(countElement){

        countElement.textContent =
            `${resultData.length} hồ sơ`;

    }


    if(resultData.length === 0){

        table.innerHTML = `

            <tr>

                <td colspan="8">
                    Chưa có hồ sơ đã thanh toán phù hợp
                </td>

            </tr>

        `;

        return;

    }


    table.innerHTML =
        resultData.map(item => {

            const project =
                getDossierProjectById(
                    item.projectId
                );


            const supplier =
                getDossierSupplierById(
                    item.supplierId
                );


            return `

                <tr>

                    <td>
                        ${escapeDossierHtml(
                            item.code || "—"
                        )}
                    </td>

                    <td>
                        ${escapeDossierHtml(
                            project?.ten ||
                            "Dự án đã xóa"
                        )}
                    </td>

                    <td>
                        ${escapeDossierHtml(
                            item.content || "—"
                        )}
                    </td>

                    <td>
                        ${escapeDossierHtml(
                            supplier?.ten ||
                            "Nhà cung cấp đã xóa"
                        )}
                    </td>

                    <td>
                        ${Number(
                            item.value || 0
                        ).toLocaleString(
                            "vi-VN"
                        )} đ
                    </td>

                    <td>
                        ${escapeDossierHtml(
                            item.documents || "—"
                        )}
                    </td>

                    <td>
                        ${escapeDossierHtml(

                            item.deliveryDate

                            ? formatDossierDate(
                                item.deliveryDate
                            )

                            : "Chưa bàn giao"

                        )}
                    </td>

                    <td>
                        Đã thanh toán
                    </td>

                </tr>

            `;

        }).join("");

}


function resetPaidDossierFilters(){

    [

        "paidSearch",
        "paidProjectFilter",
        "paidSupplierFilter",
        "paidDeliveryFilter",
        "paidFileFilter"

    ].forEach(id =>

        setDossierInputValue(
            id,
            ""
        )

    );


    filterPaidDossier();

}


// =====================================
// TRANG HỒ SƠ CẦN BỔ SUNG
// =====================================

function loadMissingDossierFilters(){

    loadDossierFilterOptions(

        "missingProjectFilter",

        getDossierProjects(),

        "Tất cả dự án"

    );


    loadDossierFilterOptions(

        "missingSupplierFilter",

        getDossierSuppliers(),

        "Tất cả nhà cung cấp"

    );

}


function filterMissingDossier(){

    const keyword =
        normalizeDossierText(

            getDossierInputValue(
                "missingSearch"
            )

        );


    const projectId =
        getDossierInputValue(
            "missingProjectFilter"
        );


    const supplierId =
        getDossierInputValue(
            "missingSupplierFilter"
        );


    const deliveryFilter =
        getDossierInputValue(
            "missingDeliveryFilter"
        );


    const paymentFilter =
        getDossierInputValue(
            "missingPaymentFilter"
        );


    const filtered =
        dossiers.filter(item => {

            const missingDocuments =
                String(
                    item.documents || ""
                ).trim();


            if(!missingDocuments){

                return false;

            }


            const project =
                getDossierProjectById(
                    item.projectId
                );


            const supplier =
                getDossierSupplierById(
                    item.supplierId
                );


            const searchText =
                normalizeDossierText(`

                    ${item.code || ""}

                    ${item.content || ""}

                    ${missingDocuments}

                    ${project?.ten || ""}

                    ${supplier?.ten || ""}

                `);


            const hasDelivery =
                Boolean(

                    String(
                        item.deliveryDate || ""
                    ).trim()

                );


            return (

                searchText.includes(
                    keyword
                )

                &&

                (
                    !projectId

                    ||

                    String(item.projectId)
                    ===
                    projectId
                )

                &&

                (
                    !supplierId

                    ||

                    String(item.supplierId)
                    ===
                    supplierId
                )

                &&

                (
                    !deliveryFilter

                    ||

                    (
                        deliveryFilter === "done"

                        &&

                        hasDelivery
                    )

                    ||

                    (
                        deliveryFilter === "not"

                        &&

                        !hasDelivery
                    )
                )

                &&

                (
                    !paymentFilter

                    ||

                    String(
                        item.paymentStatus ||
                        "Chưa thanh toán"
                    )

                    ===

                    paymentFilter
                )

            );

        });


    renderMissingDossier(
        filtered
    );

}


function renderMissingDossier(data){

    const table =
        getDossierElement(
            "missingTable"
        );


    if(!table){

        return;

    }


    const resultData =
        Array.isArray(data)

        ? data

        : [];


    const countElement =
        getDossierElement(
            "missingResultCount"
        );


    if(countElement){

        countElement.textContent =
            `${resultData.length} hồ sơ`;

    }


    if(resultData.length === 0){

        table.innerHTML = `

            <tr>

                <td colspan="8">
                    Không có hồ sơ cần bổ sung phù hợp
                </td>

            </tr>

        `;

        return;

    }


    table.innerHTML =
        resultData.map(item => {

            const project =
                getDossierProjectById(
                    item.projectId
                );


            const supplier =
                getDossierSupplierById(
                    item.supplierId
                );


            return `

                <tr>

                    <td>
                        ${escapeDossierHtml(
                            item.code || "—"
                        )}
                    </td>

                    <td>
                        ${escapeDossierHtml(
                            project?.ten ||
                            "Dự án đã xóa"
                        )}
                    </td>

                    <td>
                        ${escapeDossierHtml(
                            item.content || "—"
                        )}
                    </td>

                    <td>
                        ${escapeDossierHtml(
                            supplier?.ten ||
                            "Nhà cung cấp đã xóa"
                        )}
                    </td>

                    <td>
                        ${Number(
                            item.value || 0
                        ).toLocaleString(
                            "vi-VN"
                        )} đ
                    </td>

                    <td>
                        ${escapeDossierHtml(
                            item.documents || "—"
                        )}
                    </td>

                    <td>
                        ${escapeDossierHtml(

                            item.deliveryDate

                            ? formatDossierDate(
                                item.deliveryDate
                            )

                            : "Chưa bàn giao"

                        )}
                    </td>

                    <td>
                        ${escapeDossierHtml(
                            item.paymentStatus ||
                            "Chưa thanh toán"
                        )}
                    </td>

                </tr>

            `;

        }).join("");

}


function resetMissingDossierFilters(){

    [

        "missingSearch",
        "missingProjectFilter",
        "missingSupplierFilter",
        "missingDeliveryFilter",
        "missingPaymentFilter"

    ].forEach(id =>

        setDossierInputValue(
            id,
            ""
        )

    );


    filterMissingDossier();

}


// =====================================
// SỰ KIỆN
// =====================================

document.addEventListener(

    "input",

    function(event){

        const id =
            event.target?.id;


        if(id === "searchDossier"){

            filterDossier();

        }


        if(id === "deliverySearch"){

            filterDeliveryDossier();

        }


        if(id === "paidSearch"){

            filterPaidDossier();

        }


        if(id === "missingSearch"){

            filterMissingDossier();

        }

    }

);


document.addEventListener(

    "change",

    function(event){

        const id =
            event.target?.id;


        if(
            [

                "filterStatus",
                "filterPayment",
                "filterDelivery",
                "filterFile",
                "filterProjectSort"

            ].includes(id)
        ){

            filterDossier();

        }


        if(
            [

                "deliveryProjectFilter",
                "deliverySupplierFilter",
                "deliveryPaymentFilter",
                "deliveryDateFrom",
                "deliveryDateTo"

            ].includes(id)
        ){

            filterDeliveryDossier();

        }


        if(
            [

                "paidProjectFilter",
                "paidSupplierFilter",
                "paidDeliveryFilter",
                "paidFileFilter"

            ].includes(id)
        ){

            filterPaidDossier();

        }


        if(
            [

                "missingProjectFilter",
                "missingSupplierFilter",
                "missingDeliveryFilter",
                "missingPaymentFilter"

            ].includes(id)
        ){

            filterMissingDossier();

        }

    }

);


document.addEventListener(

    "click",

    function(event){

        if(
            event.target?.id ===
            "dossierModal"
        ){

            closeDossierForm();

        }

    }

);


document.addEventListener(

    "keydown",

    function(event){

        if(event.key !== "Escape"){

            return;

        }


        const modal =
            getDossierElement(
                "dossierModal"
            );


        if(
            modal

            &&

            modal.classList.contains(
                "is-open"
            )
        ){

            closeDossierForm();

        }

    }

);


// =====================================
// TẢI NỀN
// =====================================

document.addEventListener(

    "DOMContentLoaded",

    async function(){

        try{

            if(
                typeof Parse ===
                "undefined"

                ||

                !Parse.User.current()
            ){

                return;

            }


            await Promise.all([

                typeof loadProjectSelect ===
                "function"

                ? loadProjectSelect()

                : Promise.resolve(),


                typeof loadSupplierSelect ===
                "function"

                ? loadSupplierSelect()

                : Promise.resolve()

            ]);


            await migrateDossiersToBack4App();


            await fetchDossiersFromBack4App(
                true
            );


            refreshAllDossierViews();

        }catch(error){

            console.error(
                "Không thể đồng bộ Hồ sơ khi khởi động:",
                error
            );

        }

    }

);


// =====================================
// ĐƯA HÀM RA WINDOW
// =====================================
window.goToDossierPage =
    goToDossierPage;

window.changeDossierPageSize =
    changeDossierPageSize;

window.updateDossierSummary =
    updateDossierSummary;

window.clearDossierSelection =
    clearDossierSelection;

window.openDossierForm =
    openDossierForm;

window.closeDossierForm =
    closeDossierForm;

window.saveDossier =
    saveDossier;

window.loadDossier =
    loadDossier;

window.renderDossier =
    renderDossier;

window.editDossier =
    editDossier;

window.deleteDossier =
    deleteDossier;

window.filterDossier =
    filterDossier;

window.toggleDossierSelection =
    toggleDossierSelection;

window.toggleSelectAllDossiers =
    toggleSelectAllDossiers;

window.applyBulkDossierUpdate =
    applyBulkDossierUpdate;

window.migrateDossiersToBack4App =
    migrateDossiersToBack4App;

window.fetchDossiersFromBack4App =
    fetchDossiersFromBack4App;

window.loadDeliveryDossierFilters =
    loadDeliveryDossierFilters;

window.filterDeliveryDossier =
    filterDeliveryDossier;

window.renderDeliveryDossier =
    renderDeliveryDossier;

window.resetDeliveryDossierFilters =
    resetDeliveryDossierFilters;

window.loadPaidDossierFilters =
    loadPaidDossierFilters;

window.filterPaidDossier =
    filterPaidDossier;

window.renderPaidDossier =
    renderPaidDossier;

window.resetPaidDossierFilters =
    resetPaidDossierFilters;

window.loadMissingDossierFilters =
    loadMissingDossierFilters;

window.filterMissingDossier =
    filterMissingDossier;

window.renderMissingDossier =
    renderMissingDossier;

window.resetMissingDossierFilters =
    resetMissingDossierFilters;

window.getDossiersData =
    function(){

        return [...dossiers];

    };
