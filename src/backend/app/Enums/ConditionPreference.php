<?php

namespace App\Enums;

enum ConditionPreference: string
{
    case NewOnly = 'new_only';
    case UsedOk = 'used_ok';
    case CartridgeOnly = 'cartridge_only';
}
