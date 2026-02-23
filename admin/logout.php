<?php
// Logout script for admin
session_start();
session_destroy();
header('Location: ../index.html');
exit();
?>
