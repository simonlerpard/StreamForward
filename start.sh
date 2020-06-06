#!/bin/bash                                                                


iptables -I FORWARD -p tcp --dport 32400 -j DROP
iptables -t nat -I PREROUTING -p tcp --dport 32400 -j DNAT --to-destination ${DESTINATION_IP}:${DESTINATION_PORT}
iptables -t nat -I POSTROUTING -j MASQUERADE

ipset create temp_host hash:ip timeout ${DEFAULT_TIMEOUT} 
iptables -I FORWARD -p tcp --dport 32400 -m set -j ACCEPT --match-set temp_host src










echo "This is a idle script (infinite loop) to keep container running."    
echo "Please replace this script."                                         
                                                                           
cleanup ()                                                                 
{                                                                          
  kill -s SIGTERM $!                                                         
  exit 0                                                                     
}                                                                          

trap cleanup SIGINT SIGTERM                                                
                                                                           
while [ 1 ]                                                                
do                                                                         
  sleep 60 &                                                             
  wait $!                                                                
done
