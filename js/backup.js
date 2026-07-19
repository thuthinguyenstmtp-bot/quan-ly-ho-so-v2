// =====================================
// BACKUP.JS
// Sao lưu và khôi phục dữ liệu ứng dụng
// =====================================


// Những khóa dữ liệu mà phần mềm đang sử dụng
const APP_STORAGE_KEYS = [

    "suppliers",

    "projects",

    "dossiers",

    "letters",

    "archiveDossiers"

];


let pendingBackupData = null;


// =====================================
// ĐỌC DỮ LIỆU LOCALSTORAGE AN TOÀN
// =====================================

function readBackupStorage(key){

    try{

        const rawData =
            localStorage.getItem(key);


        if(rawData === null){

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


// =====================================
// TẠO OBJECT SAO LƯU
// =====================================

function createBackupObject(){

    const backupData = {};


    APP_STORAGE_KEYS.forEach(key => {

        backupData[key] =
            readBackupStorage(key);

    });


    return {

        appName:
            "QuanLyHoSo",

        backupVersion:
            1,

        exportedAt:
            new Date().toISOString(),

        data:
            backupData

    };

}


// =====================================
// TẠO TÊN FILE
// =====================================

function createBackupFileName(){

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            now.getDate()
        ).padStart(2, "0");


    const hour =
        String(
            now.getHours()
        ).padStart(2, "0");


    const minute =
        String(
            now.getMinutes()
        ).padStart(2, "0");


    return `QUAN_LY_HO_SO_BACKUP_${year}-${month}-${day}_${hour}-${minute}.json`;

}


// =====================================
// TẢI FILE JSON
// =====================================

function downloadBackupObject(
    backupObject,
    fileName
){

    const jsonContent =
        JSON.stringify(
            backupObject,
            null,
            2
        );


    const blob =
        new Blob(
            [jsonContent],
            {
                type:
                    "application/json;charset=utf-8"
            }
        );


    const downloadUrl =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href =
        downloadUrl;


    link.download =
        fileName;


    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);


    URL.revokeObjectURL(
        downloadUrl
    );

}


// =====================================
// XUẤT FILE SAO LƯU
// =====================================

window.exportAppBackup = function(){

    const backupObject =
        createBackupObject();


    const fileName =
        createBackupFileName();


    downloadBackupObject(
        backupObject,
        fileName
    );


    alert(
        "Đã xuất file sao lưu dữ liệu."
    );

};


// =====================================
// KHỞI TẠO TRANG
// =====================================

window.initializeBackupPage = function(){

    updateBackupSummary();

    clearBackupSelection();

};


// =====================================
// CẬP NHẬT SỐ LƯỢNG
// =====================================

function updateBackupSummary(){

    const suppliers =
        readBackupStorage(
            "suppliers"
        );


    const projects =
        readBackupStorage(
            "projects"
        );


    const dossiers =
        readBackupStorage(
            "dossiers"
        );


    const letters =
        readBackupStorage(
            "letters"
        );


    const archiveDossiers =
        readBackupStorage(
            "archiveDossiers"
        );


    setBackupText(
        "backupSupplierCount",
        suppliers.length
    );


    setBackupText(
        "backupProjectCount",
        projects.length
    );


    setBackupText(
        "backupDossierCount",
        dossiers.length
    );


    setBackupText(
        "backupLetterCount",
        letters.length
    );


    setBackupText(
        "backupArchiveCount",
        archiveDossiers.length
    );

}


// =====================================
// GÁN TEXT AN TOÀN
// =====================================

function setBackupText(
    elementId,
    value
){

    const element =
        document.getElementById(
            elementId
        );


    if(element){

        element.textContent =
            String(value);

    }

}


// =====================================
// ĐỊNH DẠNG NGÀY GIỜ
// =====================================

function formatBackupDateTime(value){

    if(!value){

        return "Không xác định";

    }


    const date =
        new Date(value);


    if(
        Number.isNaN(
            date.getTime()
        )
    ){

        return value;

    }


    return date.toLocaleString(
        "vi-VN"
    );

}


// =====================================
// KIỂM TRA FILE SAO LƯU
// =====================================

function validateBackupObject(backupObject){

    if(
        !backupObject

        ||

        typeof backupObject !== "object"
    ){

        return {
            valid: false,
            message:
                "Nội dung file không hợp lệ."
        };

    }


    if(
        backupObject.appName !==
        "QuanLyHoSo"
    ){

        return {
            valid: false,
            message:
                "File này không phải file sao lưu của phần mềm Quản lý Hồ sơ."
        };

    }


    if(
        !backupObject.data

        ||

        typeof backupObject.data !==
        "object"
    ){

        return {
            valid: false,
            message:
                "File không có phần dữ liệu cần khôi phục."
        };

    }


    for(
        const key of APP_STORAGE_KEYS
    ){

        const value =
            backupObject.data[key];


        if(
            value !== undefined

            &&

            !Array.isArray(value)
        ){

            return {
                valid: false,
                message:
                    `Dữ liệu "${key}" trong file không đúng định dạng.`
            };

        }

    }


    return {
        valid: true,
        message:
            "File sao lưu hợp lệ."
    };

}


// =====================================
// XEM TRƯỚC FILE ĐÃ CHỌN
// =====================================

window.previewBackupFile = function(event){

    const file =
        event.target.files?.[0];


    const preview =
        document.getElementById(
            "backupPreview"
        );


    const restoreButton =
        document.getElementById(
            "restoreBackupButton"
        );


    pendingBackupData = null;


    if(restoreButton){

        restoreButton.disabled =
            true;

    }


    if(!file){

        if(preview){

            preview.innerHTML = `

                <p class="backup-preview-empty">
                    Chưa chọn file sao lưu.
                </p>

            `;

        }


        return;

    }


    const reader =
        new FileReader();


    reader.onload = function(loadEvent){

        try{

            const backupObject =
                JSON.parse(
                    loadEvent.target.result
                );


            const validation =
                validateBackupObject(
                    backupObject
                );


            if(!validation.valid){

                throw new Error(
                    validation.message
                );

            }


            pendingBackupData =
                backupObject;


            const data =
                backupObject.data;


            const supplierCount =
                Array.isArray(data.suppliers)
                ? data.suppliers.length
                : 0;


            const projectCount =
                Array.isArray(data.projects)
                ? data.projects.length
                : 0;


            const dossierCount =
                Array.isArray(data.dossiers)
                ? data.dossiers.length
                : 0;


            const letterCount =
                Array.isArray(data.letters)
                ? data.letters.length
                : 0;


            const archiveCount =
                Array.isArray(
                    data.archiveDossiers
                )
                ? data.archiveDossiers.length
                : 0;


            if(preview){

                preview.innerHTML = `

                    <div class="backup-preview-success">

                        <h3>
                            File sao lưu hợp lệ
                        </h3>

                        <p>
                            <strong>Tên file:</strong>
                            ${escapeBackupHtml(file.name)}
                        </p>

                        <p>
                            <strong>Ngày xuất:</strong>
                            ${escapeBackupHtml(
                                formatBackupDateTime(
                                    backupObject.exportedAt
                                )
                            )}
                        </p>

                        <div class="backup-preview-grid">

                            <span>
                                Nhà cung cấp:
                                <strong>
                                    ${supplierCount}
                                </strong>
                            </span>

                            <span>
                                Dự án:
                                <strong>
                                    ${projectCount}
                                </strong>
                            </span>

                            <span>
                                Hồ sơ:
                                <strong>
                                    ${dossierCount}
                                </strong>
                            </span>

                            <span>
                                Thư gửi:
                                <strong>
                                    ${letterCount}
                                </strong>
                            </span>

                            <span>
                                Hồ sơ lưu:
                                <strong>
                                    ${archiveCount}
                                </strong>
                            </span>

                        </div>

                    </div>

                `;

            }


            if(restoreButton){

                restoreButton.disabled =
                    false;

            }

        }catch(error){

            console.error(
                "Không đọc được file sao lưu:",
                error
            );


            pendingBackupData = null;


            if(preview){

                preview.innerHTML = `

                    <div class="backup-preview-error">

                        <strong>
                            File không hợp lệ
                        </strong>

                        <p>
                            ${escapeBackupHtml(
                                error.message
                            )}
                        </p>

                    </div>

                `;

            }


            if(restoreButton){

                restoreButton.disabled =
                    true;

            }

        }

    };


    reader.onerror = function(){

        pendingBackupData = null;


        if(preview){

            preview.innerHTML = `

                <div class="backup-preview-error">

                    Không thể đọc file đã chọn.

                </div>

            `;

        }

    };


    reader.readAsText(file);

};


// =====================================
// KHÔI PHỤC DỮ LIỆU
// =====================================

window.restoreAppBackup = function(){

    if(!pendingBackupData){

        alert(
            "Vui lòng chọn một file sao lưu hợp lệ."
        );

        return;

    }


    const confirmed =
        confirm(

            "Dữ liệu hiện tại sẽ được thay bằng dữ liệu trong file sao lưu.\n\nBạn có chắc chắn muốn tiếp tục?"

        );


    if(!confirmed){

        return;

    }


    try{

        // Tự xuất bản sao lưu hiện tại trước
        const currentBackup =
            createBackupObject();


        downloadBackupObject(

            currentBackup,

            `TRUOC_KHI_KHOI_PHUC_${createBackupFileName()}`

        );


        APP_STORAGE_KEYS.forEach(key => {

            const restoredValue =
                pendingBackupData.data[key];


            const safeValue =
                Array.isArray(restoredValue)
                ? restoredValue
                : [];


            localStorage.setItem(

                key,

                JSON.stringify(
                    safeValue
                )

            );

        });


        alert(
            "Khôi phục dữ liệu thành công. Trang sẽ được tải lại."
        );


        window.location.reload();

    }catch(error){

        console.error(
            "Khôi phục dữ liệu thất bại:",
            error
        );


        alert(
            "Không thể khôi phục dữ liệu. Dữ liệu hiện tại chưa bị thay đổi hoàn toàn."
        );

    }

};


// =====================================
// BỎ FILE ĐÃ CHỌN
// =====================================

window.clearBackupSelection = function(){

    pendingBackupData = null;


    const fileInput =
        document.getElementById(
            "backupFileInput"
        );


    const preview =
        document.getElementById(
            "backupPreview"
        );


    const restoreButton =
        document.getElementById(
            "restoreBackupButton"
        );


    if(fileInput){

        fileInput.value = "";

    }


    if(preview){

        preview.innerHTML = `

            <p class="backup-preview-empty">
                Chưa chọn file sao lưu.
            </p>

        `;

    }


    if(restoreButton){

        restoreButton.disabled =
            true;

    }

};


// =====================================
// CHỐNG CHÈN HTML
// =====================================

function escapeBackupHtml(value){

    return String(value ?? "")

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");

}