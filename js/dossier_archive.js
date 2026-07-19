// =====================================
// DOSSIER_ARCHIVE.JS
// Quản lý hồ sơ lưu trữ
// =====================================

let archiveDossiers = [];

let editingArchiveId = null;


// =====================================
// HÀM HỖ TRỢ
// =====================================

function getArchiveElement(id){

    return document.getElementById(id);

}


function getArchiveValue(id){

    const element =
        getArchiveElement(id);

    return element
        ? String(element.value || "").trim()
        : "";

}


function setArchiveValue(id, value){

    const element =
        getArchiveElement(id);

    if(element){

        element.value =
            value ?? "";

    }

}


function normalizeArchiveText(value){

    return String(value || "")

        .normalize("NFD")

        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

        .toLowerCase()

        .trim();

}


function escapeArchiveHtml(value){

    return String(value ?? "")

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");

}


function formatArchiveDate(date){

    if(!date){

        return "—";

    }


    const parts =
        String(date).split("-");


    if(parts.length !== 3){

        return date;

    }


    return `${parts[2]}/${parts[1]}/${parts[0]}`;

}


// =====================================
// KHỞI TẠO TRANG
// =====================================

function initializeArchivePage(){

    loadArchiveDossiers();

    loadArchiveOptions();

    filterArchiveDossiers();

}


window.initializeArchivePage =
    initializeArchivePage;


// =====================================
// LOAD DỮ LIỆU
// =====================================

function loadArchiveDossiers(){

    try{

        const storedData =
            localStorage.getItem(
                "archiveDossiers"
            );


        archiveDossiers =
            storedData
            ? JSON.parse(storedData)
            : [];


        if(!Array.isArray(archiveDossiers)){

            archiveDossiers = [];

        }

    }catch(error){

        console.error(
            "Không đọc được dữ liệu hồ sơ lưu:",
            error
        );

        archiveDossiers = [];

    }

}


// =====================================
// LƯU LOCALSTORAGE
// =====================================

function saveArchiveToStorage(){

    localStorage.setItem(

        "archiveDossiers",

        JSON.stringify(
            archiveDossiers
        )

    );

}


// =====================================
// LOAD DỰ ÁN VÀ NCC
// =====================================

function loadArchiveOptions(){

    const projectSelect =
        getArchiveElement(
            "archiveProject"
        );

    const projectFilter =
        getArchiveElement(
            "archiveProjectFilter"
        );


    if(projectSelect){

        projectSelect.innerHTML = `

            <option value="">
                -- Không liên kết dự án --
            </option>

        `;

    }


    if(projectFilter){

        projectFilter.innerHTML = `

            <option value="">
                Tất cả dự án
            </option>

        `;

    }


    [...projects]

    .sort((a, b) =>

        String(a.ten || a.name || "")
        .localeCompare(
            String(b.ten || b.name || ""),
            "vi"
        )

    )

    .forEach(project => {

        const projectName =

            project.ten

            ||

            project.name

            ||

            "Dự án không có tên";


        if(projectSelect){

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                String(project.id);

            option.textContent =
                projectName;

            projectSelect.appendChild(
                option
            );

        }


        if(projectFilter){

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                String(project.id);

            option.textContent =
                projectName;

            projectFilter.appendChild(
                option
            );

        }

    });


    // LOAD NHÀ CUNG CẤP VÀO DATALIST

    const supplierLists = [

        getArchiveElement(
            "archiveSupplierList"
        ),

        getArchiveElement(
            "archiveSupplierFilterList"
        )

    ];


    supplierLists.forEach(list => {

        if(!list){

            return;

        }


        list.innerHTML = "";


        [...suppliers]

        .sort((a, b) =>

            getArchiveSupplierLabel(a)
            .localeCompare(
                getArchiveSupplierLabel(b),
                "vi"
            )

        )

        .forEach(supplier => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                getArchiveSupplierLabel(
                    supplier
                );


            option.dataset.id =
                String(supplier.id);


            list.appendChild(option);

        });

    });


    // LOAD MÃ HỒ SƠ VÀO DATALIST

    const dossierLists = [

        getArchiveElement(
            "archiveDossierList"
        ),

        getArchiveElement(
            "archiveDossierFilterList"
        )

    ];


    dossierLists.forEach(list => {

        if(!list){

            return;

        }


        list.innerHTML = "";


        [...dossiers]

        .sort((a, b) =>

            String(a.code || "")
            .localeCompare(
                String(b.code || ""),
                "vi"
            )

        )

        .forEach(dossier => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                getArchiveDossierLabel(
                    dossier
                );


            option.dataset.id =
                String(dossier.id);


            list.appendChild(option);

        });

    });


    // TẠO DANH SÁCH BỘ MÃ

    const codeGroupFilter =
        getArchiveElement(
            "archiveCodeGroupFilter"
        );


    if(codeGroupFilter){

        codeGroupFilter.innerHTML = `

            <option value="">
                Tất cả bộ mã hồ sơ
            </option>

        `;


        const codeGroups = [

            ...new Set(

                dossiers

                .map(item =>

                    getArchiveCodeGroup(
                        item.code
                    )

                )

                .filter(Boolean)

            )

        ].sort((a, b) =>

            a.localeCompare(b, "vi")

        );


        codeGroups.forEach(group => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                group;

            option.textContent =
                `Bộ mã ${group}`;

            codeGroupFilter.appendChild(
                option
            );

        });

    }

}

window.handleArchiveDossierLinkChange =
function(){

    const linkedDossierId =
        getArchiveDatalistId(

            "archiveLinkedDossierSearch",

            "archiveDossierList"

        );


    setArchiveValue(

        "archiveLinkedDossierId",

        linkedDossierId

    );


    const projectSelect =
        getArchiveElement(
            "archiveProject"
        );


    const supplierSearch =
        getArchiveElement(
            "archiveSupplierSearch"
        );


    if(!linkedDossierId){

        if(projectSelect){

            projectSelect.disabled =
                false;

        }

        if(supplierSearch){

            supplierSearch.disabled =
                false;

        }

        setArchiveValue(
            "archiveSupplierId",
            ""
        );

        return;

    }


    const dossier =
        dossiers.find(item =>

            String(item.id) ===
            String(linkedDossierId)

        );


    if(!dossier){

        return;

    }


    setArchiveValue(

        "archiveProject",

        dossier.projectId || ""

    );


    const supplier =
        getArchiveSupplierById(
            dossier.supplierId
        );


    setArchiveValue(

        "archiveSupplierId",

        dossier.supplierId || ""

    );


    setArchiveValue(

        "archiveSupplierSearch",

        getArchiveSupplierLabel(
            supplier
        )

    );


    if(projectSelect){

        projectSelect.disabled =
            true;

    }


    if(supplierSearch){

        supplierSearch.disabled =
            true;

    }

};


// =====================================
// XỬ LÝ Ô TÌM NHÀ CUNG CẤP
// =====================================

window.handleArchiveSupplierSearchChange =
function(){

    const supplierId =
        getArchiveDatalistId(

            "archiveSupplierSearch",

            "archiveSupplierList"

        );


    setArchiveValue(

        "archiveSupplierId",

        supplierId

    );

};

// =====================================
// MỞ FORM TẠO MỚI
// =====================================

window.openArchiveForm = function(){

    editingArchiveId = null;

    resetArchiveForm();

    loadArchiveOptions();


    const title =
        getArchiveElement(
            "archiveFormTitle"
        );


    if(title){

        title.textContent =
            "Thêm hồ sơ lưu";

    }


    const modal =
        getArchiveElement(
            "archiveModal"
        );


    if(modal){

        modal.classList.add("show");

        modal.style.display =
            "flex";

        document.body.style.overflow =
            "hidden";

    }

};


// =====================================
// ĐÓNG FORM
// =====================================

window.closeArchiveForm = function(){

    const modal =
        getArchiveElement(
            "archiveModal"
        );


    if(modal){

        modal.classList.remove("show");

        modal.style.display =
            "none";

    }


    document.body.style.overflow = "";

    editingArchiveId = null;

};


// =====================================
// RESET FORM
// =====================================

function resetArchiveForm(){

    setArchiveValue(
        "archiveType",
        ""
    );

    setArchiveValue(
        "archiveCode",
        ""
    );

    setArchiveValue(
        "archiveName",
        ""
    );

    setArchiveValue(
        "archiveProject",
        ""
    );

    setArchiveValue(
    "archiveLinkedDossierSearch",
    ""
);

setArchiveValue(
    "archiveLinkedDossierId",
    ""
);

setArchiveValue(
    "archiveSupplierSearch",
    ""
);

setArchiveValue(
    "archiveSupplierId",
    ""
);


const projectSelect =
    getArchiveElement(
        "archiveProject"
    );

const supplierSearch =
    getArchiveElement(
        "archiveSupplierSearch"
    );


if(projectSelect){

    projectSelect.disabled =
        false;

}

if(supplierSearch){

    supplierSearch.disabled =
        false;

}

    setArchiveValue(

        "archiveDate",

        new Date()
        .toISOString()
        .split("T")[0]

    );

    setArchiveValue(
        "archiveLocation",
        ""
    );

    setArchiveValue(
        "archiveQuantity",
        "1"
    );

    setArchiveValue(
        "archiveNote",
        ""
    );

}


// =====================================
// LƯU HỒ SƠ
// =====================================

window.saveArchiveDossier = function(){

    const type =
        getArchiveValue(
            "archiveType"
        );

    const code =
        getArchiveValue(
            "archiveCode"
        );

    const name =
        getArchiveValue(
            "archiveName"
        );

    const linkedDossierId =
    getArchiveValue(
        "archiveLinkedDossierId"
    );


let projectId =
    getArchiveValue(
        "archiveProject"
    );


let supplierId =
    getArchiveValue(
        "archiveSupplierId"
    );


const linkedDossier =
    dossiers.find(item =>

        String(item.id) ===
        String(linkedDossierId)

    );


if(linkedDossier){

    projectId =
        String(
            linkedDossier.projectId || ""
        );

    supplierId =
        String(
            linkedDossier.supplierId || ""
        );

}

    const archiveDate =
        getArchiveValue(
            "archiveDate"
        );

    const location =
        getArchiveValue(
            "archiveLocation"
        );

    const quantity =
        Number(
            getArchiveValue(
                "archiveQuantity"
            ) || 1
        );

    const note =
        getArchiveValue(
            "archiveNote"
        );


    if(!type){

        alert(
            "Vui lòng chọn loại hồ sơ."
        );

        return;

    }


    if(!code){

        alert(
            "Vui lòng nhập số hoặc mã hồ sơ."
        );

        return;

    }


    if(!name){

        alert(
            "Vui lòng nhập tên tài liệu."
        );

        return;

    }


    if(!archiveDate){

        alert(
            "Vui lòng chọn ngày lưu."
        );

        return;

    }


    if(quantity < 1){

        alert(
            "Số lượng phải lớn hơn 0."
        );

        return;

    }


    const duplicatedCode =
        archiveDossiers.some(item => {

            const sameCode =

                normalizeArchiveText(
                    item.code
                )

                ===

                normalizeArchiveText(
                    code
                );


            const differentItem =

                editingArchiveId === null

                ||

                String(item.id) !==
                String(editingArchiveId);


            return (
                sameCode &&
                differentItem
            );

        });


    if(duplicatedCode){

        alert(
            "Số hoặc mã hồ sơ này đã tồn tại."
        );

        return;

    }


    const now =
        new Date().toISOString();


    const archiveData = {

        id:
            editingArchiveId !== null
            ? editingArchiveId
            : Date.now(),

        type: type,

        code: code,

        name: name,

        linkedDossierId: linkedDossierId,

        projectId: projectId,

        supplierId: supplierId,

        archiveDate: archiveDate,

        location: location,

        quantity: quantity,

        note: note,

        createdAt: now,

        updatedAt: now


    };


    if(editingArchiveId !== null){

        const index =
            archiveDossiers.findIndex(

                item =>

                    String(item.id) ===
                    String(editingArchiveId)

            );


        if(index !== -1){

            archiveData.createdAt =

                archiveDossiers[index]
                .createdAt

                ||

                now;


            archiveDossiers[index] =
                archiveData;

        }

    }else{

        archiveDossiers.push(
            archiveData
        );

    }


    saveArchiveToStorage();

    closeArchiveForm();

    filterArchiveDossiers();

    alert(
        "Đã lưu hồ sơ."
    );

};


// =====================================
// HIỂN THỊ
// =====================================

function renderArchiveDossiers(data){

    const table =
        getArchiveElement(
            "archiveTable"
        );


    if(!table){

        return;

    }


    const resultCount =
        getArchiveElement(
            "archiveResultCount"
        );


    if(resultCount){

        resultCount.textContent =
            `${data.length} hồ sơ`;

    }


    table.innerHTML = "";


    if(data.length === 0){

        table.innerHTML = `

            <tr>

                <td
                    colspan="10"
                    class="archive-empty-row"
                >
                    Chưa có hồ sơ lưu phù hợp
                </td>

            </tr>

        `;

        return;

    }


    data.forEach(item => {

        const linkedDossier =
    dossiers.find(dossier =>

        String(dossier.id) ===
        String(item.linkedDossierId)

    );


const linkedDossierCode =
    linkedDossier
    ? linkedDossier.code || "—"
    : "—";

        const project =
            projects.find(

                projectItem =>

                    String(projectItem.id) ===
                    String(item.projectId)

            );


        const supplier =
            suppliers.find(

                supplierItem =>

                    String(supplierItem.id) ===
                    String(item.supplierId)

            );


        const projectName =
            project
            ? project.ten || "—"
            : "—";


        const supplierName =
            supplier
            ? supplier.ten || "—"
            : "—";


        table.innerHTML += `

            <tr>

                <td>
                    ${escapeArchiveHtml(
                        item.type
                    )}
                </td>

                <td>
                    ${escapeArchiveHtml(
                        item.code
                    )}
                </td>

                <td>
                    ${escapeArchiveHtml(
                        linkedDossierCode
    )}
                </td>

                <td>
                    ${escapeArchiveHtml(
                        item.name
                    )}
                </td>

                <td>
                    ${escapeArchiveHtml(
                        projectName
                    )}
                </td>

                <td>
                    ${escapeArchiveHtml(
                        supplierName
                    )}
                </td>

                <td>
                    ${formatArchiveDate(
                        item.archiveDate
                    )}
                </td>

                <td>
                    ${escapeArchiveHtml(
                        item.location || "—"
                    )}
                </td>

                <td>
                    ${Number(
                        item.quantity || 1
                    )}
                </td>

                <td>

                    <button
                        type="button"
                        onclick="editArchiveDossier('${item.id}')"
                    >
                        Sửa
                    </button>

                    <button
                        type="button"
                        onclick="deleteArchiveDossier('${item.id}')"
                    >
                        Xóa
                    </button>

                </td>

            </tr>

        `;

    });

}


// =====================================
// LỌC
// =====================================

window.filterArchiveDossiers = function(){

    const keyword =
        normalizeArchiveText(

            getArchiveValue(
                "archiveSearch"
            )

        );


    const type =
        getArchiveValue(
            "archiveTypeFilter"
        );


    const linkedDossierKeyword =
        normalizeArchiveText(

            getArchiveValue(
                "archiveLinkedDossierFilter"
            )

        );


    const codeGroup =
        getArchiveValue(
            "archiveCodeGroupFilter"
        );


    const projectId =
        getArchiveValue(
            "archiveProjectFilter"
        );


    const supplierKeyword =
        normalizeArchiveText(

            getArchiveValue(
                "archiveSupplierSearchFilter"
            )

        );


    const filteredData =
        archiveDossiers.filter(item => {

            const linkedDossier =
                dossiers.find(dossier =>

                    String(dossier.id) ===
                    String(item.linkedDossierId)

                );


            const effectiveProjectId =

                item.projectId

                ||

                linkedDossier?.projectId

                ||

                "";


            const effectiveSupplierId =

                item.supplierId

                ||

                linkedDossier?.supplierId

                ||

                "";


            const supplier =
                getArchiveSupplierById(
                    effectiveSupplierId
                );


            const supplierLabel =
                getArchiveSupplierLabel(
                    supplier
                );


            const linkedDossierLabel =
                getArchiveDossierLabel(
                    linkedDossier
                );


            const linkedDossierCode =

                linkedDossier?.code

                ||

                "";


            const currentCodeGroup =
                getArchiveCodeGroup(

                    linkedDossierCode

                    ||

                    item.code

                );


            const searchText =
                normalizeArchiveText(`

                    ${item.code || ""}

                    ${item.name || ""}

                    ${item.location || ""}

                    ${item.note || ""}

                    ${linkedDossierLabel}

                    ${supplierLabel}

                `);


            const matchKeyword =

                searchText.includes(
                    keyword
                );


            const matchType =

                type === ""

                ||

                item.type === type;


            const matchLinkedDossier =

                linkedDossierKeyword === ""

                ||

                normalizeArchiveText(
                    linkedDossierLabel
                )
                .includes(
                    linkedDossierKeyword
                );


            const matchCodeGroup =

                codeGroup === ""

                ||

                currentCodeGroup ===
                codeGroup;


            const matchProject =

                projectId === ""

                ||

                String(effectiveProjectId) ===
                String(projectId);


            const matchSupplier =

                supplierKeyword === ""

                ||

                normalizeArchiveText(
                    supplierLabel
                )
                .includes(
                    supplierKeyword
                );


            return (

                matchKeyword

                &&

                matchType

                &&

                matchLinkedDossier

                &&

                matchCodeGroup

                &&

                matchProject

                &&

                matchSupplier

            );

        });


    renderArchiveDossiers(
        filteredData
    );

};

// =====================================
// SỬA
// =====================================

window.editArchiveDossier = function(id){

    const item =
        archiveDossiers.find(

            archiveItem =>

                String(archiveItem.id) ===
                String(id)

        );


    if(!item){

        alert(
            "Không tìm thấy hồ sơ."
        );

        return;

    }


    editingArchiveId =
        item.id;


    loadArchiveOptions();


    setArchiveValue(
        "archiveType",
        item.type
    );

    setArchiveValue(
        "archiveCode",
        item.code
    );

    setArchiveValue(
        "archiveName",
        item.name
    );

    setArchiveValue(
        "archiveProject",
        item.projectId
    );

    setArchiveValue(
        "archiveSupplier",
        item.supplierId
    );

    setArchiveValue(
        "archiveDate",
        item.archiveDate
    );

    setArchiveValue(
        "archiveLocation",
        item.location
    );

    setArchiveValue(
        "archiveQuantity",
        item.quantity
    );

    setArchiveValue(
        "archiveNote",
        item.note
    );


    const title =
        getArchiveElement(
            "archiveFormTitle"
        );


    if(title){

        title.textContent =
            "Chỉnh sửa hồ sơ lưu";

    }


    const modal =
        getArchiveElement(
            "archiveModal"
        );


    if(modal){

        modal.classList.add("show");

        modal.style.display =
            "flex";

    }


    document.body.style.overflow =
        "hidden";

};


// =====================================
// XÓA
// =====================================

window.deleteArchiveDossier = function(id){

    const item =
        archiveDossiers.find(

            archiveItem =>

                String(archiveItem.id) ===
                String(id)

        );


    if(!item){

        return;

    }


    const confirmed =
        confirm(

            `Bạn có chắc chắn muốn xóa hồ sơ "${item.name}"?`

        );


    if(!confirmed){

        return;

    }


    archiveDossiers =
        archiveDossiers.filter(

            archiveItem =>

                String(archiveItem.id) !==
                String(id)

        );


    saveArchiveToStorage();

    filterArchiveDossiers();

};


// =====================================
// XÓA BỘ LỌC
// =====================================

window.resetArchiveFilters = function(){

    setArchiveValue(
        "archiveSearch",
        ""
    );

    setArchiveValue(
        "archiveTypeFilter",
        ""
    );

    setArchiveValue(
        "archiveLinkedDossierFilter",
        ""
    );

    setArchiveValue(
        "archiveCodeGroupFilter",
        ""
    );

    setArchiveValue(
        "archiveProjectFilter",
        ""
    );

    setArchiveValue(
        "archiveSupplierSearchFilter",
        ""
    );


    filterArchiveDossiers();

};

// =====================================
// TÊN DỰ ÁN
// =====================================

function getArchiveProjectName(projectId){

    const project =
        projects.find(item =>

            String(item.id) ===
            String(projectId)

        );


    return project
        ? project.ten || project.name || ""
        : "";

}


// =====================================
// TÊN HIỂN THỊ NHÀ CUNG CẤP
// =====================================

function getArchiveSupplierLabel(supplier){

    if(!supplier){

        return "";

    }


    const supplierCode =

        supplier.code

        ||

        supplier.ma

        ||

        supplier.maNCC

        ||

        "";


    const supplierName =

        supplier.ten

        ||

        supplier.name

        ||

        "Nhà cung cấp không có tên";


    if(supplierCode){

        return `${supplierCode} - ${supplierName}`;

    }


    return `${supplierName} (#${supplier.id})`;

}


// =====================================
// TÌM NHÀ CUNG CẤP
// =====================================

function getArchiveSupplierById(supplierId){

    return suppliers.find(item =>

        String(item.id) ===
        String(supplierId)

    );

}


// =====================================
// TÊN HIỂN THỊ MÃ HỒ SƠ
// =====================================

function getArchiveDossierLabel(dossier){

    if(!dossier){

        return "";

    }


    const supplier =
        getArchiveSupplierById(
            dossier.supplierId
        );


    const supplierName =
        supplier
        ? supplier.ten || supplier.name || ""
        : "";


    const values = [

        dossier.code || "Không có mã",

        dossier.content || "",

        supplierName

    ];


    return values
        .filter(Boolean)
        .join(" | ");

}


// =====================================
// LẤY ID TỪ DATALIST
// =====================================

function getArchiveDatalistId(
    inputId,
    datalistId
){

    const input =
        document.getElementById(
            inputId
        );

    const datalist =
        document.getElementById(
            datalistId
        );


    if(!input || !datalist){

        return "";

    }


    const selectedOption =
        Array.from(
            datalist.options
        ).find(option =>

            option.value ===
            input.value

        );


    return selectedOption
        ? String(
            selectedOption.dataset.id || ""
        )
        : "";

}


// =====================================
// LẤY BỘ MÃ HỒ SƠ
// Ví dụ HĐ-2026-001 => HĐ
// =====================================

function getArchiveCodeGroup(code){

    const normalizedCode =
        String(code || "")
        .trim()
        .toUpperCase();


    if(!normalizedCode){

        return "";

    }


    return normalizedCode
        .split(/[-/._\s]+/)
        .filter(Boolean)[0] || "";

}