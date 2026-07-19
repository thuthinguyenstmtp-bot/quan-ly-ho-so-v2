// =====================================
// SUPPLIER.JS
// Quản lý Nhà cung cấp bằng Back4App
// =====================================

const SUPPLIER_CLASS_NAME =
    "Supplier";

const SUPPLIER_MIGRATION_KEY =
    "supplierBack4AppMigrationV1";


let suppliers =
    getStorageArray("suppliers");

let editingSupplierId =
    null;

let supplierDataLoaded =
    false;

let supplierLoadingPromise =
    null;

let supplierMigrationPromise =
    null;


// =====================================
// HÀM HỖ TRỢ
// =====================================

function getSupplierElement(id){

    return document.getElementById(id);

}


function getSupplierInputValue(id){

    const element =
        getSupplierElement(id);

    return element
        ? String(
            element.value || ""
        ).trim()
        : "";

}


function setSupplierInputValue(
    id,
    value
){

    const element =
        getSupplierElement(id);

    if(element){

        element.value =
            value ?? "";

    }

}


function normalizeSupplierText(value){

    return String(value || "")

        .normalize("NFD")

        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

        .toLowerCase()

        .trim();

}


function escapeSupplierHtml(value){

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


function getStorageArray(key){

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


function getCurrentSupplierKeyword(){

    const searchInput =
        getSupplierElement(
            "searchSupplier"
        );

    return searchInput
        ? searchInput.value
        : "";

}


function ensureSupplierBack4AppReady(){

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
            "Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại."
        );

    }

}


function setSupplierTableMessage(
    message,
    isError = false
){

    const table =
        getSupplierElement(
            "supplierTable"
        );

    if(!table){

        return;

    }


    const textColor =
        isError
        ? "#dc2626"
        : "#6b7280";


    table.innerHTML = `

        <tr>

            <td
                colspan="5"
                style="
                    text-align:center;
                    padding:25px;
                    color:${textColor};
                "
            >
                ${escapeSupplierHtml(message)}
            </td>

        </tr>

    `;

}


function setSupplierSaveBusy(
    isBusy,
    isEditing
){

    const button =
        getSupplierElement(
            "supplierSaveButton"
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

            ? "Cập nhật Nhà cung cấp"

            : "Lưu Nhà cung cấp"
        );

}


// =====================================
// CACHE TẠM CHO CÁC MODULE CHƯA MIGRATE
// =====================================

function saveSuppliersToStorage(){

    try{

        localStorage.setItem(

            "suppliers",

            JSON.stringify(suppliers)

        );

    }catch(error){

        console.error(
            "Không cập nhật được cache Nhà cung cấp:",
            error
        );

    }

}


// =====================================
// CHUYỂN PARSE OBJECT THÀNH OBJECT THƯỜNG
// =====================================

function supplierParseObjectToPlain(
    parseObject
){

    const legacyId =
        String(
            parseObject.get(
                "legacyId"
            ) || ""
        ).trim();


    return {

        /*
        ID dùng cho các module cũ.

        NCC cũ:
        id = legacyId

        NCC tạo mới:
        id = objectId
        */

        id:
            legacyId ||
            parseObject.id,


        // ID thật trên Back4App
        back4appId:
            parseObject.id,


        ten:
            String(
                parseObject.get("ten") ||
                ""
            ),


        diachi:
            String(
                parseObject.get("diachi") ||
                ""
            ),


        nguoinhan:
            String(
                parseObject.get(
                    "nguoinhan"
                ) || ""
            ),


        sdt:
            String(
                parseObject.get("sdt") ||
                ""
            ),


        createdAt:
            parseObject.createdAt

            ? parseObject.createdAt
                .toISOString()

            : "",


        updatedAt:
            parseObject.updatedAt

            ? parseObject.updatedAt
                .toISOString()

            : ""

    };

}


// =====================================
// TÌM NCC ĐÃ MIGRATE
// =====================================

async function findExistingSupplierForMigration(
    item
){

    const back4appId =
        String(
            item.back4appId || ""
        ).trim();


    // Kiểm tra bằng objectId trước
    if(back4appId){

        try{

            const queryByObjectId =
                new Parse.Query(
                    SUPPLIER_CLASS_NAME
                );


            return await queryByObjectId.get(
                back4appId
            );

        }catch(error){

            // Không tìm thấy thì kiểm tra tiếp

        }

    }


    const legacyId =
        String(
            item.id || ""
        ).trim();


    // Kiểm tra bằng ID cũ
    if(legacyId){

        const queryByLegacyId =
            new Parse.Query(
                SUPPLIER_CLASS_NAME
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


    // Kiểm tra bằng tên chuẩn hóa
    const normalizedName =
        normalizeSupplierText(
            item.ten
        );


    if(normalizedName){

        const queryByName =
            new Parse.Query(
                SUPPLIER_CLASS_NAME
            );


        queryByName.equalTo(
            "tenNormalized",
            normalizedName
        );


        return await queryByName.first();

    }


    return null;

}


// =====================================
// MIGRATE NCC CŨ LÊN BACK4APP
// =====================================

async function migrateSuppliersToBack4App(
    force = false
){

    if(supplierMigrationPromise){

        return supplierMigrationPromise;

    }


    supplierMigrationPromise =
        (async function(){

            ensureSupplierBack4AppReady();


            // Đã migrate rồi thì không chạy lại
            if(
                !force
                &&
                localStorage.getItem(
                    SUPPLIER_MIGRATION_KEY
                )
            ){

                return {

                    migrated: 0,

                    skipped: 0,

                    alreadyCompleted: true

                };

            }


            const oldSuppliers =
                getStorageArray(
                    "suppliers"
                );


            const currentUser =
                Parse.User.current();


            let migrated = 0;

            let skipped = 0;


            for(
                const item
                of oldSuppliers
            ){

                const name =
                    String(
                        item.ten || ""
                    ).trim();


                if(!name){

                    skipped += 1;

                    continue;

                }


                const legacyId =
                    String(
                        item.id || ""
                    ).trim();


                const existingSupplier =
                    await findExistingSupplierForMigration(
                        item
                    );


                if(existingSupplier){

                    /*
                    NCC đã tồn tại trên Back4App
                    nhưng chưa có legacyId.
                    */

                    if(
                        legacyId
                        &&
                        !existingSupplier.get(
                            "legacyId"
                        )
                    ){

                        existingSupplier.set(
                            "legacyId",
                            legacyId
                        );


                        await existingSupplier.save();

                    }


                    skipped += 1;

                    continue;

                }


                const supplierObject =
                    new Parse.Object(
                        SUPPLIER_CLASS_NAME
                    );


                supplierObject.set(
                    "ten",
                    name
                );


                supplierObject.set(
                    "tenNormalized",
                    normalizeSupplierText(
                        name
                    )
                );


                supplierObject.set(
                    "diachi",
                    String(
                        item.diachi || ""
                    )
                );


                supplierObject.set(
                    "nguoinhan",
                    String(
                        item.nguoinhan || ""
                    )
                );


                supplierObject.set(
                    "sdt",
                    String(
                        item.sdt || ""
                    )
                );


                if(legacyId){

                    supplierObject.set(
                        "legacyId",
                        legacyId
                    );

                }


                if(currentUser){

                    supplierObject.set(
                        "createdBy",
                        currentUser
                    );


                    supplierObject.set(
                        "updatedBy",
                        currentUser
                    );

                }


                await supplierObject.save();


                migrated += 1;

            }


            localStorage.setItem(

                SUPPLIER_MIGRATION_KEY,

                JSON.stringify({

                    completedAt:
                        new Date()
                        .toISOString(),

                    migrated:
                        migrated,

                    skipped:
                        skipped

                })

            );


            console.log(

                "✅ Migrate Nhà cung cấp hoàn tất:",

                {
                    migrated,
                    skipped
                }

            );


            return {

                migrated,

                skipped,

                alreadyCompleted: false

            };

        })();


    try{

        return await supplierMigrationPromise;

    }finally{

        supplierMigrationPromise =
            null;

    }

}


// =====================================
// ĐỌC NCC TỪ BACK4APP
// =====================================

async function fetchSuppliersFromBack4App(
    forceReload = false
){

    ensureSupplierBack4AppReady();


    if(
        supplierDataLoaded
        &&
        !forceReload
    ){

        return suppliers;

    }


    if(supplierLoadingPromise){

        return supplierLoadingPromise;

    }


    supplierLoadingPromise =
        (async function(){

            const query =
                new Parse.Query(
                    SUPPLIER_CLASS_NAME
                );


            query.ascending("ten");


            query.limit(1000);


            const results =
                await query.find();


            suppliers =
                results.map(
                    supplierParseObjectToPlain
                );


            supplierDataLoaded =
                true;


            /*
            localStorage chỉ còn là cache.
            Back4App mới là nguồn dữ liệu chính.
            */

            saveSuppliersToStorage();


            return suppliers;

        })();


    try{

        return await supplierLoadingPromise;

    }finally{

        supplierLoadingPromise =
            null;

    }

}


// =====================================
// LOAD NHÀ CUNG CẤP
// =====================================

async function loadSupplier(){

    setSupplierTableMessage(
        "Đang tải Nhà cung cấp..."
    );


    try{

        await migrateSuppliersToBack4App();


        await fetchSuppliersFromBack4App(
            true
        );


        renderSupplier(
            getCurrentSupplierKeyword()
        );


        renderSupplierSelectOptions();


        return suppliers;

    }catch(error){

        console.error(
            "Không tải được Nhà cung cấp:",
            error
        );


        setSupplierTableMessage(

            error.message ||
            "Không tải được Nhà cung cấp.",

            true

        );


        return [];

    }

}


// =====================================
// MỞ FORM TẠO MỚI
// =====================================

function openSupplierForm(){

    editingSupplierId =
        null;


    resetSupplierForm();


    const form =
        getSupplierElement(
            "supplierForm"
        );


    if(!form){

        console.error(
            "Không tìm thấy id supplierForm"
        );

        return;

    }


    const title =
        getSupplierElement(
            "supplierFormTitle"
        );


    const button =
        getSupplierElement(
            "supplierSaveButton"
        );


    if(title){

        title.textContent =
            "Thêm Nhà cung cấp";

    }


    if(button){

        button.disabled =
            false;

        button.textContent =
            "Lưu Nhà cung cấp";

    }


    form.style.display =
        "block";

}


// =====================================
// ĐÓNG FORM
// =====================================

function closeSupplierForm(){

    const form =
        getSupplierElement(
            "supplierForm"
        );


    if(form){

        form.style.display =
            "none";

    }


    editingSupplierId =
        null;


    resetSupplierForm();

}


// =====================================
// RESET FORM
// =====================================

function resetSupplierForm(){

    setSupplierInputValue(
        "supplierName",
        ""
    );


    setSupplierInputValue(
        "supplierAddress",
        ""
    );


    setSupplierInputValue(
        "supplierReceiver",
        ""
    );


    setSupplierInputValue(
        "supplierPhone",
        ""
    );

}


// =====================================
// KIỂM TRA TRÙNG TÊN TRÊN SERVER
// =====================================

async function supplierNameExistsOnServer(
    normalizedName,
    excludedObjectId = ""
){

    const query =
        new Parse.Query(
            SUPPLIER_CLASS_NAME
        );


    query.equalTo(
        "tenNormalized",
        normalizedName
    );


    if(excludedObjectId){

        query.notEqualTo(
            "objectId",
            excludedObjectId
        );

    }


    const duplicatedSupplier =
        await query.first();


    return Boolean(
        duplicatedSupplier
    );

}


// =====================================
// LƯU / CẬP NHẬT NCC
// =====================================

async function saveSupplier(){

    const name =
        getSupplierInputValue(
            "supplierName"
        );


    const address =
        getSupplierInputValue(
            "supplierAddress"
        );


    const receiver =
        getSupplierInputValue(
            "supplierReceiver"
        );


    const phone =
        getSupplierInputValue(
            "supplierPhone"
        );


    if(!name){

        alert(
            "Vui lòng nhập tên Nhà cung cấp."
        );


        getSupplierElement(
            "supplierName"
        )?.focus();


        return;

    }


    const isEditing =
        editingSupplierId !== null;


    setSupplierSaveBusy(
        true,
        isEditing
    );


    try{

        ensureSupplierBack4AppReady();


        /*
        Luôn tải dữ liệu mới nhất trước khi lưu,
        tránh dùng danh sách cũ của máy hiện tại.
        */

        await migrateSuppliersToBack4App();


        await fetchSuppliersFromBack4App(
            true
        );


        const editingSupplier =
            isEditing

            ? suppliers.find(item =>

                String(item.id) ===
                String(editingSupplierId)

            )

            : null;


        if(
            isEditing
            &&
            !editingSupplier
        ){

            throw new Error(
                "Không tìm thấy Nhà cung cấp cần chỉnh sửa."
            );

        }


        const normalizedName =
            normalizeSupplierText(name);


        const duplicatedLocally =
            suppliers.some(item => {

                const sameName =

                    normalizeSupplierText(
                        item.ten
                    )

                    ===

                    normalizedName;


                const differentSupplier =

                    !isEditing

                    ||

                    String(item.id) !==
                    String(editingSupplierId);


                return (
                    sameName
                    &&
                    differentSupplier
                );

            });


        if(duplicatedLocally){

            alert(
                "Tên Nhà cung cấp này đã tồn tại."
            );

            return;

        }


        const back4appId =
            editingSupplier
            ? String(
                editingSupplier.back4appId ||
                ""
            )
            : "";


        const duplicatedOnServer =
            await supplierNameExistsOnServer(

                normalizedName,

                back4appId

            );


        if(duplicatedOnServer){

            alert(
                "Tên Nhà cung cấp này đã tồn tại trên hệ thống."
            );

            return;

        }


        let supplierObject;


        if(isEditing){

            if(!back4appId){

                throw new Error(
                    "Nhà cung cấp chưa có objectId trên Back4App."
                );

            }


            const query =
                new Parse.Query(
                    SUPPLIER_CLASS_NAME
                );


            supplierObject =
                await query.get(
                    back4appId
                );

        }else{

            supplierObject =
                new Parse.Object(
                    SUPPLIER_CLASS_NAME
                );

        }


        supplierObject.set(
            "ten",
            name
        );


        supplierObject.set(
            "tenNormalized",
            normalizedName
        );


        supplierObject.set(
            "diachi",
            address
        );


        supplierObject.set(
            "nguoinhan",
            receiver
        );


        supplierObject.set(
            "sdt",
            phone
        );


        const currentUser =
            Parse.User.current();


        if(
            !isEditing
            &&
            currentUser
        ){

            supplierObject.set(
                "createdBy",
                currentUser
            );

        }


        if(currentUser){

            supplierObject.set(
                "updatedBy",
                currentUser
            );

        }


        await supplierObject.save();


        await fetchSuppliersFromBack4App(
            true
        );


        renderSupplier(
            getCurrentSupplierKeyword()
        );


        renderSupplierSelectOptions();


        closeSupplierForm();


        alert(

            isEditing

            ? "Đã cập nhật Nhà cung cấp."

            : "Đã thêm Nhà cung cấp."

        );

    }catch(error){

        console.error(
            "Không lưu được Nhà cung cấp:",
            error
        );


        alert(

            "Không lưu được Nhà cung cấp.\n\n"

            +

            (
                error.message ||
                error
            )

        );

    }finally{

        setSupplierSaveBusy(
            false,
            isEditing
        );

    }

}


// =====================================
// HIỂN THỊ + TÌM KIẾM
// =====================================

function renderSupplier(
    keyword = ""
){

    const table =
        getSupplierElement(
            "supplierTable"
        );


    if(!table){

        return;

    }


    const normalizedKeyword =
        normalizeSupplierText(keyword);


    const filteredSuppliers =
        suppliers.filter(item => {

            const searchText = `

                ${item.ten || ""}

                ${item.diachi || ""}

                ${item.nguoinhan || ""}

                ${item.sdt || ""}

            `;


            return normalizeSupplierText(
                searchText
            )
            .includes(
                normalizedKeyword
            );

        });


    if(
        filteredSuppliers.length ===
        0
    ){

        setSupplierTableMessage(
            "Chưa có Nhà cung cấp phù hợp"
        );

        return;

    }


    table.innerHTML =
        filteredSuppliers

        .map(item => `

            <tr>

                <td>
                    ${escapeSupplierHtml(
                        item.ten || "—"
                    )}
                </td>

                <td>
                    ${escapeSupplierHtml(
                        item.diachi || "—"
                    )}
                </td>

                <td>
                    ${escapeSupplierHtml(
                        item.nguoinhan || "—"
                    )}
                </td>

                <td>
                    ${escapeSupplierHtml(
                        item.sdt || "—"
                    )}
                </td>

                <td>

                    <button
                        type="button"
                        onclick="
                            editSupplier(
                                '${item.id}'
                            )
                        "
                    >
                        Sửa
                    </button>

                    <button
                        type="button"
                        onclick="
                            deleteSupplier(
                                '${item.id}'
                            )
                        "
                    >
                        Xóa
                    </button>

                </td>

            </tr>

        `)

        .join("");

}


// =====================================
// CHỈNH SỬA NCC
// =====================================

function editSupplier(id){

    const supplier =
        suppliers.find(item =>

            String(item.id) ===
            String(id)

        );


    if(!supplier){

        alert(
            "Không tìm thấy Nhà cung cấp."
        );

        return;

    }


    editingSupplierId =
        supplier.id;


    setSupplierInputValue(
        "supplierName",
        supplier.ten
    );


    setSupplierInputValue(
        "supplierAddress",
        supplier.diachi
    );


    setSupplierInputValue(
        "supplierReceiver",
        supplier.nguoinhan
    );


    setSupplierInputValue(
        "supplierPhone",
        supplier.sdt
    );


    const form =
        getSupplierElement(
            "supplierForm"
        );


    const title =
        getSupplierElement(
            "supplierFormTitle"
        );


    const button =
        getSupplierElement(
            "supplierSaveButton"
        );


    if(form){

        form.style.display =
            "block";

    }


    if(title){

        title.textContent =
            "Chỉnh sửa Nhà cung cấp";

    }


    if(button){

        button.disabled =
            false;

        button.textContent =
            "Cập nhật Nhà cung cấp";

    }

}


// =====================================
// KIỂM TRA LIÊN KẾT TẠM THỜI
// =====================================
// Hồ sơ, Thư và Hồ sơ lưu vẫn ở localStorage.
// Vì vậy phần này hiện chỉ kiểm tra dữ liệu
// liên kết trên máy đang sử dụng.

function getSupplierRelations(
    supplier
){

    const validSupplierIds =
        new Set(

            [
                supplier.id,
                supplier.back4appId
            ]

            .filter(Boolean)

            .map(value =>
                String(value)
            )

        );


    function matchesSupplierId(value){

        return validSupplierIds.has(
            String(value || "")
        );

    }


    const dossierData =
        getStorageArray(
            "dossiers"
        );


    const letterData =
        getStorageArray(
            "letters"
        );


    const archiveData =
        getStorageArray(
            "archiveDossiers"
        );


    const dossierCount =
        dossierData.filter(item =>

            matchesSupplierId(
                item.supplierId
            )

        ).length;


    const letterCount =
        letterData.filter(item =>

            matchesSupplierId(
                item.supplierId
            )

        ).length;


    const archiveCount =
        archiveData.filter(item => {

            let effectiveSupplierId =
                String(
                    item.supplierId || ""
                );


            if(
                !effectiveSupplierId
                &&
                item.linkedDossierId
            ){

                const linkedDossier =
                    dossierData.find(
                        dossier =>

                            String(dossier.id)

                            ===

                            String(
                                item.linkedDossierId
                            )
                    );


                effectiveSupplierId =
                    linkedDossier

                    ? String(
                        linkedDossier.supplierId ||
                        ""
                    )

                    : "";

            }


            return matchesSupplierId(
                effectiveSupplierId
            );

        }).length;


    return {

        dossierCount,

        letterCount,

        archiveCount,

        totalCount:
            dossierCount
            +
            letterCount
            +
            archiveCount

    };

}


// =====================================
// XÓA NCC
// =====================================

async function deleteSupplier(id){

    const supplier =
        suppliers.find(item =>

            String(item.id) ===
            String(id)

        );


    if(!supplier){

        alert(
            "Không tìm thấy Nhà cung cấp."
        );

        return;

    }


    const relations =
        getSupplierRelations(
            supplier
        );


    if(relations.totalCount > 0){

        alert(

            `Không thể xóa Nhà cung cấp "${supplier.ten}".\n\n`

            +

            `Nhà cung cấp này đang được sử dụng trong:\n`

            +

            `- ${relations.dossierCount} hồ sơ chính\n`

            +

            `- ${relations.letterCount} thư\n`

            +

            `- ${relations.archiveCount} hồ sơ lưu\n\n`

            +

            `Tổng cộng: ${relations.totalCount} dữ liệu liên kết.`

        );

        return;

    }


    const confirmed =
        confirm(

            `Bạn có chắc chắn muốn xóa Nhà cung cấp "${supplier.ten}"?\n\n`

            +

            "Thao tác này không thể hoàn tác."

        );


    if(!confirmed){

        return;

    }


    try{

        ensureSupplierBack4AppReady();


        const back4appId =
            String(
                supplier.back4appId || ""
            );


        if(!back4appId){

            throw new Error(
                "Nhà cung cấp chưa có objectId trên Back4App."
            );

        }


        const query =
            new Parse.Query(
                SUPPLIER_CLASS_NAME
            );


        const supplierObject =
            await query.get(
                back4appId
            );


        await supplierObject.destroy();


        await fetchSuppliersFromBack4App(
            true
        );


        if(
            editingSupplierId !== null
            &&
            String(editingSupplierId) ===
            String(id)
        ){

            closeSupplierForm();

        }


        renderSupplier(
            getCurrentSupplierKeyword()
        );


        renderSupplierSelectOptions();


        alert(
            `Đã xóa Nhà cung cấp "${supplier.ten}".`
        );

    }catch(error){

        console.error(
            "Không xóa được Nhà cung cấp:",
            error
        );


        alert(

            "Không xóa được Nhà cung cấp.\n\n"

            +

            (
                error.message ||
                error
            )

        );

    }

}


// =====================================
// DROPDOWN NCC TRONG HỒ SƠ
// =====================================

function renderSupplierSelectOptions(){

    const select =
        getSupplierElement(
            "dossierSupplier"
        );


    if(!select){

        return;

    }


    const currentValue =
        select.value;


    select.innerHTML = `

        <option value="">
            -- Chọn Nhà cung cấp --
        </option>

    `;


    const sortedSuppliers =
        [...suppliers].sort(

            (a, b) =>

                String(a.ten || "")
                .localeCompare(
                    String(b.ten || ""),
                    "vi"
                )

        );


    sortedSuppliers.forEach(item => {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            item.id;


        option.textContent =
            item.ten ||
            "Không có tên";


        select.appendChild(
            option
        );

    });


    const valueStillExists =
        suppliers.some(item =>

            String(item.id) ===
            String(currentValue)

        );


    select.value =
        valueStillExists
        ? currentValue
        : "";

}


async function loadSupplierSelect(){

    try{

        await migrateSuppliersToBack4App();


        await fetchSuppliersFromBack4App();


        renderSupplierSelectOptions();

    }catch(error){

        console.error(
            "Không tải được dropdown Nhà cung cấp:",
            error
        );

    }

}


// =====================================
// TÌM KIẾM NCC
// =====================================

document.addEventListener(

    "input",

    function(event){

        if(
            event.target
            &&
            event.target.id ===
            "searchSupplier"
        ){

            renderSupplier(
                event.target.value
            );

        }

    }

);


// =====================================
// TẢI NCC NỀN KHI MỞ HỆ THỐNG
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


            await migrateSuppliersToBack4App();


            await fetchSuppliersFromBack4App(
                true
            );


            if(
                getSupplierElement(
                    "supplierTable"
                )
            ){

                renderSupplier(
                    getCurrentSupplierKeyword()
                );

            }


            renderSupplierSelectOptions();

        }catch(error){

            console.error(
                "Không thể đồng bộ Nhà cung cấp khi khởi động:",
                error
            );

        }

    }

);


// =====================================
// ĐƯA HÀM RA WINDOW
// =====================================

window.openSupplierForm =
    openSupplierForm;


window.closeSupplierForm =
    closeSupplierForm;


window.saveSupplier =
    saveSupplier;


window.editSupplier =
    editSupplier;


window.deleteSupplier =
    deleteSupplier;


window.loadSupplier =
    loadSupplier;


window.loadSupplierSelect =
    loadSupplierSelect;


window.renderSupplier =
    renderSupplier;


window.migrateSuppliersToBack4App =
    migrateSuppliersToBack4App;


window.getSuppliersData =
    function(){

        return [...suppliers];

    };