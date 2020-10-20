<?php
if (isset($_FILES["video"])) {
    $fileName = $_FILES["video"]["name"];
    $uploadDirectory = './videos/' . $fileName;
    if (!move_uploaded_file($_FILES["video"]["tmp_name"], $uploadDirectory)) {
        echo ("Couldn't upload video!");
    }
} else {
    echo "No file recorded";
}
