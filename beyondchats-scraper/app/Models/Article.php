<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Article extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'content',
        'author',
        'ai_title',
        'ai_content',
        'published_at',
        'url',
    ];
}

