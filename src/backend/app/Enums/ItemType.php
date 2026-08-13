<?php

namespace App\Enums;

enum ItemType: string
{
    case Game = 'game';
    case Console = 'console';
    case Peripheral = 'peripheral';
    case Book = 'book';
}
