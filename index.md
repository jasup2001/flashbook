---
layout: none
---

<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <title>Flashbook</title>
    <style>
        body {
            background: #111;
            margin: 0;
            font-family: sans-serif;
            color: #eee;
        }
        header {
            padding: 20px;
            text-align: center;
            border-bottom: 1px solid #333;
        }
        header img {
            height: 80px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
            padding: 20px;
        }
        .grid img {
            width: 100%;
            border-radius: 10px;
            display: block;
        }
    </style>
</head>
<body>

<header>
    <img src="logo.png" alt="Logo">
</header>

<div class="grid">
{% for file in site.static_files %}
  {% if file.path contains '/img/' %}
    <img src="{{ file.path }}" alt="">
  {% endif %}
{% endfor %}
</div>

</body>
</html>
