<?php

namespace App\Enums;

enum ScrapeStatus: string
{
    case Pending = 'pending';
    case Scraping = 'scraping';
    case Scraped = 'scraped';
    case Failed = 'failed';
    case Manual = 'manual';
}
