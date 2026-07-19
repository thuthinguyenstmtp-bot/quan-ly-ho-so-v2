// =====================================
// PROJECT.JS
// Quản lý Dự án
// =====================================

let projects = [];

let editingProjectId = null;


// =====================================
// HÀM HỖ TRỢ
// =====================================

function getProjectElement(id){

    return document.getElementById(id);

}


function getProjectInputValue(id){

    const element =
        getProjectElement(id);

    if(!element){

        return "";

    }

    return String(
        element.value || ""
    ).trim();

}


function setProjectInputValue(id, value){

    const element =
        getProjectElement(id);

    if(element){

        element.value =
            value ?? "";

    }

}


// Chuẩn hóa chữ:
// - không phân biệt hoa/thường
// - tìm kiếm được cả chữ không dấu
function normalizeProjectText(value){

    return String(value || "")

        .normalize("NFD")

        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

        .toLowerCase()

        .trim();

}


// Chống lỗi khi dữ liệu có ký tự HTML
function escapeProjectHtml(value){

    return String(value ?? "")

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");

}


// Đọc mảng từ localStorage an toàn
function getProjectStorageArray(key){

    try{

        const data =
            localStorage.getItem(key);

        if(!data){

            return [];

        }

        const parsedData =
            JSON.parse(data);

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


// Lấy từ khóa tìm kiếm hiện tại
function getCurrentProjectKeyword(){

    const searchInput =
        getProjectElement(
            "searchProject"
        );

    return searchInput
        ? searchInput.value
        : "";

}


// =====================================
// LOAD DỮ LIỆU DỰ ÁN
// =====================================

function loadProject(){

    projects =
        getProjectStorageArray(
            "projects"
        );


    let dataChanged = false;


    // Chuẩn hóa dữ liệu cũ
    projects = projects.map(

        (item, index) => {

            const projectId =

                item.id !== undefined
                &&
                item.id !== null

                ? item.id

                : Date.now() + index;


            if(
                item.id === undefined
                ||
                item.id === null
            ){

                dataChanged = true;

            }


            return {

                ...item,

                id: projectId,

                ten: String(
                    item.ten ||
                    item.name ||
                    ""
                ),

                diachi: String(
                    item.diachi ||
                    item.address ||
                    ""
                )

            };

        }

    );


    if(dataChanged){

        saveProjectsToStorage();

    }

}


// =====================================
// LƯU VÀO LOCALSTORAGE
// =====================================

function saveProjectsToStorage(){

    localStorage.setItem(

        "projects",

        JSON.stringify(projects)

    );

}


// =====================================
// MỞ FORM THÊM DỰ ÁN
// =====================================

function openProjectForm(){

    editingProjectId = null;

    resetProjectForm();


    const form =
        getProjectElement(
            "projectForm"
        );


    if(!form){

        console.error(
            "Không tìm thấy id projectForm"
        );

        return;

    }


    const title =
        getProjectElement(
            "projectFormTitle"
        );


    if(title){

        title.textContent =
            "Thêm dự án";

    }


    const saveButton =
        getProjectElement(
            "projectSaveButton"
        );


    if(saveButton){

        saveButton.textContent =
            "Lưu dự án";

    }


    form.style.display =
        "block";


    getProjectElement(
        "projectName"
    )?.focus();

}


// =====================================
// ĐÓNG FORM
// =====================================

function closeProjectForm(){

    const form =
        getProjectElement(
            "projectForm"
        );


    if(form){

        form.style.display =
            "none";

    }


    editingProjectId = null;

    resetProjectForm();

}


// =====================================
// LÀM MỚI FORM
// =====================================

function resetProjectForm(){

    setProjectInputValue(
        "projectName",
        ""
    );

    setProjectInputValue(
        "projectAddress",
        ""
    );

}


// =====================================
// LƯU / CẬP NHẬT DỰ ÁN
// =====================================

function saveProject(){

    const projectName =
        getProjectInputValue(
            "projectName"
        );

    const projectAddress =
        getProjectInputValue(
            "projectAddress"
        );


    if(!projectName){

        alert(
            "Vui lòng nhập tên dự án."
        );

        getProjectElement(
            "projectName"
        )?.focus();

        return;

    }


    const isEditing =
        editingProjectId !== null;


    // Kiểm tra tên dự án bị trùng
    const duplicatedProject =
        projects.find(item => {

            const sameName =

                normalizeProjectText(
                    item.ten
                )

                ===

                normalizeProjectText(
                    projectName
                );


            const differentProject =

                !isEditing

                ||

                String(item.id) !==
                String(editingProjectId);


            return (
                sameName
                &&
                differentProject
            );

        });


    if(duplicatedProject){

        alert(
            "Tên dự án này đã tồn tại."
        );

        return;

    }


    const currentTime =
        new Date().toISOString();


    // CHỈNH SỬA
    if(isEditing){

        const projectIndex =
            projects.findIndex(

                item =>

                    String(item.id) ===
                    String(editingProjectId)

            );


        if(projectIndex === -1){

            alert(
                "Không tìm thấy dự án cần chỉnh sửa."
            );

            return;

        }


        const oldProject =
            projects[projectIndex];


        projects[projectIndex] = {

            ...oldProject,

            ten: projectName,

            diachi: projectAddress,

            createdAt:
                oldProject.createdAt ||
                currentTime,

            updatedAt:
                currentTime

        };

    }else{

        // TẠO MỚI
        projects.push({

            id: Date.now(),

            ten: projectName,

            diachi: projectAddress,

            createdAt:
                currentTime,

            updatedAt:
                currentTime

        });

    }


    saveProjectsToStorage();


    renderProject(
        getCurrentProjectKeyword()
    );


    // Cập nhật dropdown tại trang Hồ sơ
    loadProjectSelect();


    closeProjectForm();


    alert(

        isEditing

        ? "Đã cập nhật dự án."

        : "Đã thêm dự án."

    );

}


// =====================================
// HIỂN THỊ DANH SÁCH DỰ ÁN
// =====================================

function renderProject(keyword = ""){

    const table =
        getProjectElement(
            "projectTable"
        );


    if(!table){

        return;

    }


    const normalizedKeyword =
        normalizeProjectText(
            keyword
        );


    const filteredProjects =
        projects.filter(item => {

            const searchText = `

                ${item.ten || ""}

                ${item.diachi || ""}

            `;


            return normalizeProjectText(
                searchText
            )
            .includes(
                normalizedKeyword
            );

        });


    if(filteredProjects.length === 0){

        table.innerHTML = `

            <tr>

                <td
                    colspan="3"
                    style="
                        text-align: center;
                        padding: 25px;
                        color: #6b7280;
                    "
                >
                    Chưa có dự án phù hợp
                </td>

            </tr>

        `;

        return;

    }


    table.innerHTML =

        filteredProjects

        .map(item => {

            return `

                <tr>

                    <td>

                        ${escapeProjectHtml(
                            item.ten || "—"
                        )}

                    </td>


                    <td>

                        ${escapeProjectHtml(
                            item.diachi || "—"
                        )}

                    </td>


                    <td>

                        <button
                            type="button"
                            onclick="editProject('${item.id}')"
                        >
                            Sửa
                        </button>


                        <button
                            type="button"
                            onclick="deleteProject('${item.id}')"
                        >
                            Xóa
                        </button>

                    </td>

                </tr>

            `;

        })

        .join("");

}


// =====================================
// CHỈNH SỬA DỰ ÁN
// =====================================

function editProject(id){

    const project =
        projects.find(

            item =>

                String(item.id) ===
                String(id)

        );


    if(!project){

        alert(
            "Không tìm thấy dự án."
        );

        return;

    }


    editingProjectId =
        project.id;


    setProjectInputValue(
        "projectName",
        project.ten
    );


    setProjectInputValue(
        "projectAddress",
        project.diachi
    );


    const form =
        getProjectElement(
            "projectForm"
        );


    if(!form){

        console.error(
            "Không tìm thấy id projectForm"
        );

        return;

    }


    const title =
        getProjectElement(
            "projectFormTitle"
        );


    if(title){

        title.textContent =
            "Chỉnh sửa dự án";

    }


    const saveButton =
        getProjectElement(
            "projectSaveButton"
        );


    if(saveButton){

        saveButton.textContent =
            "Cập nhật dự án";

    }


    form.style.display =
        "block";


    getProjectElement(
        "projectName"
    )?.focus();

}


// =====================================
// KIỂM TRA DỰ ÁN ĐANG LIÊN KẾT
// =====================================

function getProjectRelations(id){

    const dossiers =
        getProjectStorageArray(
            "dossiers"
        );


    const dossierCount =
        dossiers.filter(

            item =>

                String(item.projectId) ===
                String(id)

        ).length;


    return {

        dossierCount:
            dossierCount

    };

}


// =====================================
// XÓA DỰ ÁN
// =====================================

function deleteProject(id){

    const project =
        projects.find(

            item =>

                String(item.id) ===
                String(id)

        );


    if(!project){

        alert(
            "Không tìm thấy dự án."
        );

        return;

    }


    const relations =
        getProjectRelations(id);


    // Chặn xóa nếu đang được Hồ sơ sử dụng
    if(relations.dossierCount > 0){

        alert(

            `Không thể xóa dự án "${project.ten}".\n\n`

            +

            `Dự án đang liên kết với ${relations.dossierCount} hồ sơ.\n\n`

            +

            `Hãy chuyển các hồ sơ sang dự án khác trước khi xóa.`

        );

        return;

    }


    const confirmed =
        confirm(

            `Bạn có chắc chắn muốn xóa dự án "${project.ten}"?`

        );


    if(!confirmed){

        return;

    }


    projects =
        projects.filter(

            item =>

                String(item.id) !==
                String(id)

        );


    saveProjectsToStorage();


    if(
        editingProjectId !== null
        &&
        String(editingProjectId) ===
        String(id)
    ){

        closeProjectForm();

    }


    renderProject(
        getCurrentProjectKeyword()
    );


    loadProjectSelect();

}


// =====================================
// LOAD DỰ ÁN VÀO HỒ SƠ
// =====================================

function loadProjectSelect(){

    const select =
        getProjectElement(
            "dossierProject"
        );


    if(!select){

        return;

    }


    const currentValue =
        select.value;


    select.innerHTML = "";


    const defaultOption =
        document.createElement(
            "option"
        );


    defaultOption.value = "";

    defaultOption.textContent =
        "-- Chọn Dự án --";


    select.appendChild(
        defaultOption
    );


    // Sắp xếp theo tên dự án
    const sortedProjects =
        [...projects].sort(

            (a, b) =>

                String(a.ten || "")
                .localeCompare(
                    String(b.ten || ""),
                    "vi"
                )

        );


    sortedProjects.forEach(item => {

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


    // Giữ lựa chọn đang có nếu dự án vẫn tồn tại
    const valueStillExists =
        projects.some(

            item =>

                String(item.id) ===
                String(currentValue)

        );


    select.value =

        valueStillExists

        ? currentValue

        : "";

}


// =====================================
// TÌM KIẾM DỰ ÁN
// =====================================

document.addEventListener(

    "input",

    function(event){

        if(
            event.target
            &&
            event.target.id ===
            "searchProject"
        ){

            renderProject(
                event.target.value
            );

        }

    }

);